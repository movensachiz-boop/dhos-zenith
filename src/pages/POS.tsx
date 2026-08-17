import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, Receipt, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product, CartItem, PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ThermalReceipt } from '@/components/pos/ThermalReceipt';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts, logAudit } from '@/lib/db';
import { cacheProducts, readCachedProducts, queueSale, readQueue, writeQueue } from '@/lib/offline';

const REFERRAL_RATE = 0.05; // referrer earns 5% of the sale as credit

type Receipt = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  date: Date;
  docType: 'sale' | 'order';
  customerName?: string;
  customerPhone?: string;
  customerNumber?: string;
  referralCode?: string;
  offline?: boolean;
};

const newCustomerNumber = () => `MC${Math.floor(10000 + Math.random() * 90000)}`;

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash');
  const [docType, setDocType] = useState<'sale' | 'order'>('sale');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);

  // Enter-driven flow state
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [pendingQty, setPendingQty] = useState('1');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const list = await fetchProducts();
      setProducts(list);
      cacheProducts(list);
    } catch (e) {
      const cached = readCachedProducts<Product>();
      if (cached.length) {
        setProducts(cached);
        toast({ title: 'Offline mode', description: 'Showing cached products.' });
      } else {
        toast({ title: 'Failed to load products', description: (e as Error).message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Sync queued offline sales ---------------- */
  const syncQueue = async () => {
    const queue = readQueue();
    if (!queue.length) return;
    const remaining = [];
    for (const entry of queue) {
      try {
        const { data: sale, error } = await supabase
          .from('sales')
          .insert(entry.sale as never)
          .select()
          .single();
        if (error) throw error;
        await supabase.from('sale_items').insert(
          entry.items.map(i => ({ ...i, sale_id: sale.id })) as never
        );
      } catch {
        remaining.push(entry);
      }
    }
    writeQueue(remaining);
    if (remaining.length < queue.length) {
      toast({ title: 'Offline sales synced', description: `${queue.length - remaining.length} receipt(s) uploaded.` });
    }
  };

  useEffect(() => {
    load();
    syncQueue();
    searchRef.current?.focus();
    const goOnline = () => { setOnline(true); syncQueue(); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (pendingProduct) setTimeout(() => qtyRef.current?.select(), 50);
  }, [pendingProduct]);

  useEffect(() => {
    if (customerOpen) setTimeout(() => nameRef.current?.focus(), 50);
  }, [customerOpen]);

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

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
      if (cart.length > 0) setCustomerOpen(true);
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

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  /* ---------------- Step 3: customer details -> confirm ---------------- */
  const submitCustomer = () => {
    if (!customerName.trim()) {
      toast({ title: 'Customer name required', description: 'Enter the client name to continue', variant: 'destructive' });
      return;
    }
    setCustomerOpen(false);
    setTimeout(() => setConfirmOpen(true), 120);
  };

  /* ---------------- Step 4: confirm + Enter -> save + receipt ---------------- */
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', description: 'Add items to cart before checkout', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const receiptNumber = `${docType === 'order' ? 'ORD' : 'MC'}-${Date.now().toString().slice(-8)}`;
    let assignedNumber = customerNumber.trim();
    let discount = 0;
    let clientId: string | null = null;
    let offline = false;

    try {
      /* --- find or create the client, resolve referral credits --- */
      let client: { id: string; customer_number: string | null; referral_credits: number } | null = null;

      if (assignedNumber) {
        const { data } = await supabase
          .from('clients')
          .select('id, customer_number, referral_credits')
          .eq('customer_number', assignedNumber)
          .maybeSingle();
        client = (data as typeof client) ?? null;
      }
      if (!client && customerPhone.trim()) {
        const { data } = await supabase
          .from('clients')
          .select('id, customer_number, referral_credits')
          .eq('phone', customerPhone.trim())
          .maybeSingle();
        client = (data as typeof client) ?? null;
      }
      if (!client) {
        assignedNumber = assignedNumber || newCustomerNumber();
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: customerName.trim(),
            phone: customerPhone.trim() || null,
            customer_number: assignedNumber,
            referred_by: referralCode.trim() || null,
          } as never)
          .select('id, customer_number, referral_credits')
          .single();
        if (error) throw error;
        client = data as typeof client;
      }
      clientId = client!.id;
      assignedNumber = client!.customer_number ?? assignedNumber;

      // apply this customer's earned referral credit as a discount
      const credits = Number(client!.referral_credits ?? 0);
      discount = Math.min(credits, subtotal);

      const total = Math.max(0, subtotal - discount);

      const { data: auth } = await supabase.auth.getUser();
      const { data: sale, error } = await supabase
        .from('sales')
        .insert({
          receipt_number: receiptNumber,
          doc_type: docType,
          subtotal,
          vat_amount: 0,
          discount,
          total,
          payment_method: selectedPayment,
          currency: 'USD',
          status: 'completed',
          client_id: clientId,
          client_name: customerName.trim(),
          client_phone: customerPhone.trim() || null,
          customer_number: assignedNumber,
          referral_code: referralCode.trim() || null,
          cashier_id: auth.user?.id ?? null,
          cashier_name: auth.user?.email ?? null,
        } as never)
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
          vat_applicable: false,
          line_total: item.lineTotal,
        }))
      );
      if (itemsError) throw itemsError;

      // consume used credits
      if (discount > 0) {
        await supabase
          .from('clients')
          .update({ referral_credits: Math.max(0, credits - discount) } as never)
          .eq('id', clientId);
      }

      // reward the referrer
      const code = referralCode.trim();
      if (code && code !== assignedNumber) {
        const { data: referrer } = await supabase
          .from('clients')
          .select('id, referral_credits')
          .eq('customer_number', code)
          .maybeSingle();
        if (referrer) {
          await supabase
            .from('clients')
            .update({
              referral_credits: Number((referrer as { referral_credits: number }).referral_credits ?? 0) + total * REFERRAL_RATE,
            } as never)
            .eq('id', (referrer as { id: string }).id);
        }
      }

      await logAudit(docType === 'order' ? 'create_order' : 'create_sale', 'sale', sale.id, {
        receipt_number: receiptNumber,
        total,
      });
    } catch (e) {
      // offline / network failure -> queue and still print
      offline = true;
      discount = 0;
      assignedNumber = assignedNumber || newCustomerNumber();
      queueSale({
        sale: {
          receipt_number: receiptNumber,
          doc_type: docType,
          subtotal,
          vat_amount: 0,
          discount: 0,
          total: subtotal,
          payment_method: selectedPayment,
          currency: 'USD',
          status: 'completed',
          client_name: customerName.trim(),
          client_phone: customerPhone.trim() || null,
          customer_number: assignedNumber,
          referral_code: referralCode.trim() || null,
        },
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unit_price: item.product.sellingPrice,
          vat_applicable: false,
          line_total: item.lineTotal,
        })),
      });
      toast({
        title: 'Saved offline',
        description: 'Receipt generated. It will sync when the internet is back.',
      });
    }

    const total = Math.max(0, subtotal - discount);
    setReceipt({
      items: cart,
      subtotal,
      discount,
      total,
      paymentMethod: selectedPayment,
      receiptNumber,
      date: new Date(),
      docType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerNumber: assignedNumber,
      referralCode: referralCode.trim() || undefined,
      offline,
    });
    if (!offline) {
      toast({
        title: docType === 'order' ? 'Order Recorded!' : 'Sale Completed!',
        description: `Receipt ${receiptNumber} generated for $${total.toFixed(2)}`,
      });
    }
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNumber('');
    setReferralCode('');
    setConfirmOpen(false);
    setSaving(false);
    if (!offline) load();
  };

  const handlePrintReceipt = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=380,height=760');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>Receipt</title>
      <style>
        body{font-family:ui-monospace,monospace;font-size:11px;line-height:1.6;margin:0;padding:10px;width:80mm;color:#000;background:#fff}
        img{max-width:110px;display:block;margin:0 auto}
        div{display:block}
        .text-center{text-align:center}
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
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Enter = pick top result → Enter = quantity → Enter on empty search = customer details → Enter = complete
            </p>
            {!online && (
              <span className="flex items-center gap-1 text-xs font-medium text-warning">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
          </div>
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
          {customerName && (
            <p className="text-xs text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{customerName}</span>
              {customerNumber ? ` · ${customerNumber}` : ''}
            </p>
          )}
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
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span className="text-primary">${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Referral credit is applied at checkout.</p>
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
            onClick={() => setCustomerOpen(true)}
            disabled={cart.length === 0}
          >
            {docType === 'order' ? 'Record Order' : 'Complete Sale'} • ${subtotal.toFixed(2)}
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

      {/* Customer details */}
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent
          className="max-w-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitCustomer();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Customer details</DialogTitle>
            <DialogDescription>Press Enter to continue to confirmation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Full name *</label>
              <Input ref={nameRef} value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone</label>
              <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Customer number (existing client)</label>
              <Input
                placeholder="Leave blank to auto-generate"
                value={customerNumber}
                onChange={e => setCustomerNumber(e.target.value.toUpperCase())}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Referred by (customer number)</label>
              <Input
                placeholder="e.g. MC12345"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                The referrer earns {Math.round(REFERRAL_RATE * 100)}% of this sale as a discount credit.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCustomerOpen(false)}>Back</Button>
            <Button onClick={submitCustomer}>Continue (Enter)</Button>
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
              {customerName} · {cart.length} item(s) · ${subtotal.toFixed(2)} · Press Enter to confirm
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
