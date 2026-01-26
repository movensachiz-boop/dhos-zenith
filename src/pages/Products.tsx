import { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockCategories } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import AddProductDialog from '@/components/products/AddProductDialog';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    toast({
      title: 'Product Added',
      description: `${newProduct.name} has been added successfully.`,
    });
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({
      title: 'Product Deleted',
      description: 'Product has been removed.',
    });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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
        categories={mockCategories}
      />

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {mockCategories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
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
                <td>
                  <p className="font-medium">{product.name}</p>
                </td>
                <td>
                  <span className="text-muted-foreground font-mono text-sm">{product.sku}</span>
                </td>
                <td>
                  <span className="inline-flex px-2 py-1 rounded-md bg-muted text-xs font-medium">
                    {product.category}
                  </span>
                </td>
                <td className="text-right font-medium">${product.costPrice.toFixed(2)}</td>
                <td className="text-right font-bold text-primary">${product.sellingPrice.toFixed(2)}</td>
                <td className="text-center">
                  <span className={cn(
                    "inline-flex px-2 py-1 rounded-md text-xs font-semibold",
                    product.currentStock <= product.lowStockThreshold / 2 
                      ? "bg-destructive/10 text-destructive"
                      : product.currentStock <= product.lowStockThreshold
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                  )}>
                    {product.currentStock}
                  </span>
                </td>
                <td>
                  {product.vatApplicable ? (
                    <span className="text-success text-sm">Yes</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteProduct(product.id)}
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
      </div>
    </div>
  );
}
