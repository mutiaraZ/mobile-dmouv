// FanContext.tsx
import React, {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

interface FanContextType {
  isAutoMode: boolean;
  setIsAutoMode: Dispatch<SetStateAction<boolean>>;
}

const FanContext = createContext<FanContextType | undefined>(undefined);

interface FanProviderProps {
  children: ReactNode;
}

export const FanProvider: React.FC<FanProviderProps> = ({ children }) => {
  const [isAutoMode, setIsAutoMode] = useState(false);

  return (
    <FanContext.Provider value={{ isAutoMode, setIsAutoMode }}>
      {children}
    </FanContext.Provider>
  );
};

export const useFan = (): FanContextType => {
  const context = useContext(FanContext);
  if (context === undefined) {
    throw new Error("useFan must be used within a FanProvider");
  }
  return context;
};