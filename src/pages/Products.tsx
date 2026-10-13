import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Product, Category } from '@/types';
import { toast } from '@/hooks/use-toast';
import AddProductDialog from '@/components/products/AddProductDialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchProducts, logAudit, withFreshSession } from '@/lib/db';
import { useCachedState, isOffline } from '@/lib/cache';

export default function Products() {
  const [products, setProducts, hadCache] = useCachedState<Product[]>('mc_products_cache', []);
  const [loading, setLoading] = useState(!hadCache);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const load = async () => {
    if (isOffline()) {
      setLoading(false);
      return;
    }
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      if (!hadCache) {
        toast({ title: 'Failed to load products', description: (e as Error).message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories: Category[] = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => map.set(p.category, (map.get(p.category) ?? 0) + 1));
    return [...map.entries()].map(([name, count]) => ({ id: name, name, productCount: count }));
  }, [products]);

  const handleAddProduct = async (newProduct: Product) => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await withFreshSession(() => supabase.from('products').insert({
      name: newProduct.name,
      sku: newProduct.sku,
      barcode: newProduct.barcode ?? null,
      category: newProduct.category,
      product_type: newProduct.productType,
      cost_price: newProduct.costPrice,
      selling_price: newProduct.sellingPrice,
      vat_applicable: newProduct.vatApplicable,
      unit_of_measure: newProduct.unitOfMeasure,
      stock_tracking_enabled: newProduct.stockTrackingEnabled,
      current_stock: newProduct.currentStock,
      low_stock_threshold: newProduct.lowStockThreshold,
      created_by: auth.user?.id ?? null,
    }));
    if (error) {
      toast({ title: 'Could not save product', description: error.message, variant: 'destructive' });
      return;
    }
    await logAudit('create', 'product', undefined, { name: newProduct.name, sku: newProduct.sku });
    toast({ title: 'Product saved', description: `${newProduct.name} has been saved to the system.` });
    load();
  };

  const handleDeleteProduct = async (product: Product) => {
    const { error } = await withFreshSession(() => supabase.from('products').delete().eq('id', product.id));
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    await logAudit('delete', 'product', product.id, { name: product.name });
    toast({ title: 'Product deleted', description: `${product.name} removed.` });
    load();
  };

  const filteredProducts = products.filter(product => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(q) || product.sku.toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button variant="pos" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </Button>
      </div>

      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddProduct={handleAddProduct}
        categories={categories}
      />

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No products yet. Add your first product.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Type</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Price</th>
                <th className="text-center">Stock</th>
                <th>VAT</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td><p className="font-medium">{product.name}</p></td>
                  <td><span className="text-muted-foreground font-mono text-sm">{product.sku}</span></td>
                  <td>
                    <span className="inline-flex px-2 py-1 rounded-md bg-muted text-xs font-medium">
                      {product.category}
                    </span>
                  </td>
                  <td>
                    <span className={cn(
                      'inline-flex px-2 py-1 rounded-md text-xs font-semibold capitalize',
                      product.productType === 'cake' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {product.productType === 'cake' ? 'Cake (order)' : 'Accessory (shop)'}
                    </span>
                  </td>
                  <td className="text-right font-medium">${product.costPrice.toFixed(2)}</td>
                  <td className="text-right font-bold text-primary">${product.sellingPrice.toFixed(2)}</td>
                  <td className="text-center">
                    <span className={cn(
                      'inline-flex px-2 py-1 rounded-md text-xs font-semibold',
                      product.currentStock <= product.lowStockThreshold / 2
                        ? 'bg-destructive/10 text-destructive'
                        : product.currentStock <= product.lowStockThreshold
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                    )}>
                      {product.currentStock}
                    </span>
                  </td>
                  <td>
                    {product.vatApplicable
                      ? <span className="text-success text-sm">Yes</span>
                      : <span className="text-muted-foreground text-sm">No</span>}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
