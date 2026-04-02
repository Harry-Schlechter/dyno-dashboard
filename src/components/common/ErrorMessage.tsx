import React from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <Alert severity="error" sx={{ borderRadius: 3 }} action={
    onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : undefined
  }>
    <AlertTitle>Something went wrong</AlertTitle>
    {message}
  </Alert>
);

export default ErrorMessage;
