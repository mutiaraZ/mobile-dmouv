// hooks/useCachedResources.ts
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

export function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Roboto-Regular': require('../assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('../assets/fonts/Roboto-Medium.ttf'),
  });

  useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        // Jaga splash screen tetap terlihat
        await SplashScreen.preventAutoHideAsync();

        // Di sini Anda bisa menambahkan pemuatan aset lain, misal data dari API
      } catch (e) {
        console.warn(e);
      } finally {
        if (fontsLoaded || fontError) {
          setLoadingComplete(true);
          SplashScreen.hideAsync();
        }
      }
    }

    loadResourcesAndDataAsync();
  }, [fontsLoaded, fontError]);

  return isLoadingComplete;
}