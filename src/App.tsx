import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import MainLayout from './components/MainLayout';

Amplify.configure(outputs);

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <MainLayout onLogout={signOut || (() => {})} user={user} />
      )}
    </Authenticator>
  );
};