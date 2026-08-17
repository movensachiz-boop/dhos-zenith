import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Receipt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, CartItem, PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ThermalReceipt } from '@/components/pos/ThermalReceipt';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts, logAudit } from '@/lib/db';

const VAT_RATE = 0.15;

type Receipt = {
  items: CartItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  date: Date;
  docType: 'sale' | 'order';
  customerName?: string;
};

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [docType, setDocType] = useState<'sale' | 'order'>('sale');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Enter-driven flow state
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      toast({ title: 'Failed to load products', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (pendingProduct) {
      setTimeout(() => qtyRef.current?.select(), 50);
    }
  }, [pendingProduct]);

  const categories = useMemo(
    () => [...new Set(products.map(p => p.category))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(product => {
      const matchesSearch =
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        (product.barcode?.includes(searchQuery) ?? false);
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  /* ---------------- Step 1: search + Enter -> ask quantity ---------------- */
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (searchQuery.trim() === '') {
      // Step 3: nothing typed -> Enter moves to confirming the sale
      if (cart.length > 0) setConfirmOpen(true);
      return;
    }
    const match = filteredProducts[0];
    if (!match) {
      toast({ title: 'No product found', description: `Nothing matches "${searchQuery}"`, variant: 'destructive' });
      return;
    }
    startQuantity(match);
  };

  const startQuantity = (product: Product) => {
    setPendingQty('1');
    setPendingProduct(product);
  };

  /* ---------------- Step 2: quantity + Enter -> add to cart ---------------- */
  const confirmQuantity = () => {
    const product = pendingProduct;
    if (!product) return;
    const qty = Number(pendingQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast({ title: 'Invalid quantity', description: 'Enter a quantity greater than 0', variant: 'destructive' });
      return;
    }
    if (product.stockTrackingEnabled && qty > product.currentStock && docType === 'sale') {
      toast({
        title: 'Not enough stock',
        description: `${product.name} has only ${product.currentStock} in stock`,
        variant: 'destructive',
      });
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty, lineTotal: (i.quantity + qty) * product.sellingPrice }
            : i
        );
      }
      return [...prev, { product, quantity: qty, discount: 0, lineTotal: qty * product.sellingPrice }];
    });
    setPendingProduct(null);
    setSearchQuery('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity, lineTotal: newQuantity * item.product.sellingPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const vatAmount = cart.reduce(
    (sum, item) => sum + (item.product.vatApplicable ? item.lineTotal * VAT_RATE : 0),
    0
  );
  const total = subtotal + vatAmount;

  /* ---------------- Step 4: confirm + Enter -> save + receipt ---------------- */
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', description: 'Add items to cart before checkout', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const receiptNumber = `${docType === 'order' ? 'ORD' : 'MC'}-${Date.now().toString().slice(-8)}`;

      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          receipt_number: receiptNumber,
          doc_type: docType,
          subtotal,
          vat_amount: vatAmount,
          total,
          payment_method: selectedPayment,
          currency: 'USD',
          status: 'completed',
          client_name: customerName || null,
          cashier_id: auth.user?.id ?? null,
          cashier_name: auth.user?.email ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from('sale_items').insert(
        cart.map(item => ({
          sale_id: sale.id,
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unit_price: item.product.sellingPrice,
          vat_applicable: item.product.vatApplicable,
          line_total: item.lineTotal,
        }))
      );
      if (itemsError) throw itemsError;

      await logAudit(docType === 'order' ? 'create_order' : 'create_sale', 'sale', sale.id, {
        receipt_number: receiptNumber,
        total,
      });

      setReceipt({
        items: cart,
        subtotal,
        vatAmount,
        total,
        paymentMethod: selectedPayment,
        receiptNumber,
        date: new Date(),
        docType,
        customerName: customerName || undefined,
      });
      toast({
        title: docType === 'order' ? 'Order Recorded!' : 'Sale Completed!',
        description: `Receipt ${receiptNumber} generated for $${total.toFixed(2)}`,
      });
      setCart([]);
      setCustomerName('');
      setConfirmOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Could not record sale', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintReceipt = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=380,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Receipt</title>
      <style>
        body{font-family:ui-monospace,monospace;font-size:11px;margin:0;padding:8px;width:80mm;color:#000;background:#fff}
        img{max-width:96px;display:block;margin:0 auto}
        .flex{display:flex}.justify-between{justify-content:space-between}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const paymentMethods = [
    { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
    { id: 'mobile_money' as PaymentMethod, label: 'Mobile', icon: Smartphone },
    { id: 'bank_transfer' as PaymentMethod, label: 'Bank', icon: CreditCard },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-6 animate-fade-in">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <div className="space-y-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search name / SKU / barcode, then press Enter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-11 h-12 text-lg"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter = pick top result → Enter = confirm quantity → Enter on empty search = review & complete
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => startQuantity(product)}
                  className={cn(
                    'flex flex-col p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary transition-all duration-150 text-left group',
                    index === 0 && searchQuery && 'border-primary ring-1 ring-primary'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{product.sku}</span>
                    {product.currentStock <= product.lowStockThreshold && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">
                        Low
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">{product.category}</p>
                  <p className="text-lg font-bold text-primary mt-auto">
                    ${product.sellingPrice.toFixed(2)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 flex flex-col bg-card rounded-xl border">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Current {docType === 'order' ? 'Order' : 'Sale'}</h2>
            <span className="text-sm text-muted-foreground">{cart.length} items</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={docType === 'sale' ? 'default' : 'outline'} size="sm" onClick={() => setDocType('sale')}>
              Sale
            </Button>
            <Button variant={docType === 'order' ? 'default' : 'outline'} size="sm" onClick={() => setDocType('order')}>
              Order
            </Button>
          </div>
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Search a product and press Enter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${item.product.sellingPrice.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon-sm" onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-16 text-right">
                    <p className="font-semibold">${item.lineTotal.toFixed(2)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (15%)</span>
              <span>${vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map(method => (
              <Button
                key={method.id}
                variant={selectedPayment === method.id ? 'default' : 'outline'}
                className="flex-col h-auto py-3"
                onClick={() => setSelectedPayment(method.id)}
              >
                <method.icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{method.label}</span>
              </Button>
            ))}
          </div>

          <Button
            variant="pos"
            className="w-full"
            onClick={() => setConfirmOpen(true)}
            disabled={cart.length === 0}
          >
            {docType === 'order' ? 'Record Order' : 'Complete Sale'} • ${total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Quantity prompt */}
      <Dialog open={!!pendingProduct} onOpenChange={(open) => !open && setPendingProduct(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{pendingProduct?.name}</DialogTitle>
            <DialogDescription>
              ${pendingProduct?.sellingPrice.toFixed(2)} each · {pendingProduct?.currentStock} in stock
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              ref={qtyRef}
              type="number"
              min={1}
              step="any"
              value={pendingQty}
              autoFocus
              onChange={(e) => setPendingQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmQuantity();
                }
              }}
              className="h-12 text-lg"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPendingProduct(null)}>Cancel</Button>
            <Button onClick={confirmQuantity}>Add to cart (Enter)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm sale */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="max-w-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !saving) {
              e.preventDefault();
              handleCheckout();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Confirm {docType === 'order' ? 'Order' : 'Sale'}</DialogTitle>
            <DialogDescription>
              {cart.length} item(s) · Total ${total.toFixed(2)} · Press Enter to confirm
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Back</Button>
            <Button autoFocus onClick={handleCheckout} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm (Enter)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview */}
      <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{receipt?.docType === 'order' ? 'Order Receipt' : 'Sale Receipt'}</DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
              <ThermalReceipt ref={receiptRef} {...receipt} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReceipt(null)}>Close</Button>
            <Button onClick={handlePrintReceipt}>Print Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
