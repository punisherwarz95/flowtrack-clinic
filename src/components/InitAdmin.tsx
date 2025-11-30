import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const InitAdmin = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAdmin = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('init-admin');
        
        if (error) {
          console.error('Error initializing admin:', error);
          return;
        }

        if (data?.created) {
          console.log('Admin user created successfully');
        } else if (data?.alreadyExists) {
          console.log('Admin user already exists');
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error calling init-admin function:', error);
      }
    };

    if (!initialized) {
      initAdmin();
    }
  }, [initialized]);

  return null;
};
