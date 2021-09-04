import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const CartKeyName = "@RocketShoes:cart";

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(CartKeyName);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const existsProducts = cart.find((product) => {
        return product.id === productId;
      });

      const response = await api.get(`/stock/${productId}`);

      const stock = response.data as Stock;
      const currentAmount = existsProducts?.amount || 0;
      const newAmount = currentAmount + 1;

      if (newAmount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (existsProducts) {
        const newCart = cart.map((product) => {
          return product.id === productId
            ? { ...product, amount: newAmount }
            : product;
        });
        setCart(newCart);
        localStorage.setItem(CartKeyName, JSON.stringify(newCart));
      }

      if (!existsProducts) {
        const response = await api.get(`products/${productId}`);
        const product = response.data as Product;
        const newCart = [...cart, { ...product, amount: 1 }];
        setCart(newCart);
        localStorage.setItem(CartKeyName, JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex < 0) throw new Error();

      newCart.splice(productIndex, 1);
      setCart(newCart);
      localStorage.setItem(CartKeyName, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const existsProduct = cart.find((product) => product.id === productId);

      if (!existsProduct) throw new Error();

      const response = await api.get(`/stock/${productId}`);

      const stock = response.data as Stock;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const newCart = cart.map((product) => {
        return product.id === productId ? { ...product, amount } : product;
      });
      setCart(newCart);
      localStorage.setItem(CartKeyName, JSON.stringify(newCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
