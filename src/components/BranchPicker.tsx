import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRANCHES, setBranch } from '@/lib/branch';

export function BranchPicker({ onPicked }: { onPicked: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Choose account</CardTitle>
          <CardDescription>Which business do you want to open?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {BRANCHES.map(b => (
            <Button key={b.id} variant="outline" className="h-14 justify-start text-base"
              onClick={() => { setBranch(b.id); onPicked(); }}>
              <Store className="h-5 w-5 mr-3 text-primary" />{b.name}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
