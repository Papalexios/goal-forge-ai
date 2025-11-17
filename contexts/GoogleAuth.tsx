import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { SettingsContext } from './SettingsContext';

// The scopes required for the application to access Google Calendar events.
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

// Add type definitions for Google Identity Services and GAPI
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
        [key: string]: any;
      }
    }
  }
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface AuthContextType {
  gapi: any | null;
  token: google.accounts.oauth2.TokenResponse | null;
  profile: any | null;
  isSignedIn: boolean;
  isGsiClientReady: boolean;
  isConfigured: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
}

export const GoogleAuthContext = createContext<AuthContextType>({
  gapi: null,
  token: null,
  profile: null,
  isSignedIn: false,
  isGsiClientReady: false,
  isConfigured: false,
  signIn: async () => {},
  signOut: () => {},
});

interface GoogleAuthProviderProps {
    children: ReactNode;
}

export const GoogleAuthProvider: React.FC<GoogleAuthProviderProps> = ({ children }) => {
  const { settings } = useContext(SettingsContext);
  const { googleClientId } = settings;

  const [gapi, setGapi] = useState<any | null>(null);
  const [tokenClient, setTokenClient] = useState<any | null>(null);
  const [token, setToken] = useState<google.accounts.oauth2.TokenResponse | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isGsiClientReady, setIsGsiClientReady] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const initializeGapiClient = useCallback(async () => {
    if (!window.gapi) return;
    try {
        await window.gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        setGapi(window.gapi);
    } catch (error) {
        console.error("Error initializing GAPI client", error);
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem('google_auth_token');
  }, []);

  // GAPI client loader (for calendar API calls)
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => window.gapi.load('client', initializeGapiClient);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    }
  }, [initializeGapiClient]);
  
  // Google Identity Services (GSI) loader (for sign-in)
  useEffect(() => {
    const configured = googleClientId && !googleClientId.startsWith('YOUR_');
    setIsConfigured(configured);
    setIsGsiClientReady(false); // Reset readiness on client ID change
    setTokenClient(null);

    if (!configured) {
        return; // Abort GSI script loading if not configured
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google?.accounts?.oauth2) {
        console.error("Google Identity Services library failed to load.");
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: GOOGLE_SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error(`Google Sign-In error: ${tokenResponse.error}`);
            alert(`Google Sign-In failed. Please ensure third-party cookies are enabled and try again. Error: ${tokenResponse.error}`);
            return;
          }
          setToken(tokenResponse);
          localStorage.setItem('google_auth_token', JSON.stringify(tokenResponse));
        },
      });
      setTokenClient(client);
      setIsGsiClientReady(true); // Signal that the client is ready
    };
    script.onerror = () => {
      console.error("Failed to load Google Sign-In script.");
    };
    document.body.appendChild(script);
    
    return () => {
      if(document.body.contains(script)){
        document.body.removeChild(script);
      }
    }
  }, [googleClientId]);

  useEffect(() => {
    const storedToken = localStorage.getItem('google_auth_token');
    if (storedToken) {
        try {
            const parsedToken = JSON.parse(storedToken);
            setToken(parsedToken);
        } catch (e) {
            console.error("Failed to parse stored auth token, removing it.", e);
            localStorage.removeItem('google_auth_token');
        }
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
        if (token) {
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${token.access_token}` },
                });
                if (!response.ok) {
                    if (response.status === 401) {
                       signOut();
                       return;
                    }
                    throw new Error(`Failed to fetch profile: ${response.statusText}`);
                }
                const userProfile = await response.json();
                setProfile(userProfile);
            } catch (error) {
                console.error("Error fetching user profile, signing out.", error);
                signOut();
            }
        }
    };
    fetchProfile();
  }, [token, signOut]);

  const signIn = useCallback(async () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      alert('Google Sign-In is not yet available. Please wait a moment and try again.');
    }
  }, [tokenClient]);

  const value = {
    gapi,
    token,
    profile,
    isSignedIn: !!token && !!profile,
    isGsiClientReady,
    isConfigured,
    signIn,
    signOut,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
};
