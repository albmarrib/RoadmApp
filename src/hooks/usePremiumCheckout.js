import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebase';

export function usePremiumCheckout() {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setIsCheckoutLoading(true);
      const functions = getFunctions(auth.app, 'europe-west1');
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession();
      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (error) {
      console.error("Error iniciando pago", error);
      alert("Hubo un error al conectar con la pasarela de pago.");
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  return { startCheckout, isCheckoutLoading };
}
