import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OptionsApp } from './OptionsApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary fallbackTitle="Settings failed to load">
            <OptionsApp />
        </ErrorBoundary>
    </React.StrictMode>
);
