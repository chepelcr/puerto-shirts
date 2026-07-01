import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Carrito = Record<number, number>;

interface CartContextValue {
  carrito: Carrito;
  totalUnidades: number;
  cantidadDe: (inventarioId: number) => number;
  agregar: (inventarioId: number, max: number, cantidad?: number) => void;
  setCantidad: (inventarioId: number, cantidad: number, max: number) => void;
  quitar: (inventarioId: number) => void;
  limpiar: () => void;
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  abrir: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [carrito, setCarrito] = useState<Carrito>({});
  const [abierto, setAbierto] = useState(false);

  const setCantidad = (inventarioId: number, cantidad: number, max: number) => {
    setCarrito((prev) => {
      const next = { ...prev };
      const c = Math.max(0, Math.min(cantidad, max));
      if (c <= 0) delete next[inventarioId];
      else next[inventarioId] = c;
      return next;
    });
  };

  const agregar = (inventarioId: number, max: number, cantidad = 1) => {
    setCarrito((prev) => {
      const actual = prev[inventarioId] ?? 0;
      const c = Math.max(0, Math.min(actual + cantidad, max));
      const next = { ...prev };
      if (c <= 0) delete next[inventarioId];
      else next[inventarioId] = c;
      return next;
    });
  };

  const quitar = (inventarioId: number) =>
    setCarrito((prev) => {
      const next = { ...prev };
      delete next[inventarioId];
      return next;
    });

  const limpiar = () => setCarrito({});

  const totalUnidades = useMemo(
    () => Object.values(carrito).reduce((s, n) => s + n, 0),
    [carrito],
  );

  const value: CartContextValue = {
    carrito,
    totalUnidades,
    cantidadDe: (id) => carrito[id] ?? 0,
    agregar,
    setCantidad,
    quitar,
    limpiar,
    abierto,
    setAbierto,
    abrir: () => setAbierto(true),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
