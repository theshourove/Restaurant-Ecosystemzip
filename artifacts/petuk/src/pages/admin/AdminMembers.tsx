import React, { useState } from 'react';
import { useListMembers } from '@workspace/api-client-react';
import { Card, CardContent, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@/components/ui/shared';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminMembers() {
  const [search, setSearch] = useState('');
  const { data: members, isLoading } = useListMembers({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Members</h1>
      </div>

      <Card>
        <CardContent className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search phone or name..." 
              className="pl-10 h-12"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>}
              {members?.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-bold">{m.name}</TableCell>
                  <TableCell className="font-mono">{m.phone}</TableCell>
                  <TableCell>
                    <Badge style={m.tierColor ? { backgroundColor: m.tierColor, color: '#1A1A1A' } : undefined} className={!m.tierColor ? 'bg-card text-foreground border-border' : ''}>
                      {m.tier} ({m.discountPercent}%)
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">{m.points}</TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(m.joined), 'MMM d, yyyy')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
