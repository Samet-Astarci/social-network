export let toastRef = () => {};
export const setToastImpl = fn => (toastRef = fn);

// Modify ToastProvider to set impl
// (append inside ToastProvider useEffect)
//   import { useEffect } from 'react';
//   useEffect(() => { setToastImpl(addToast); }, [toasts]);