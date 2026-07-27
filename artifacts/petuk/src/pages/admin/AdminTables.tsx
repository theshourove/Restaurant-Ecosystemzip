import React, { useState } from 'react';
import { Card, CardContent, Button } from '@/components/ui/shared';
import { QrCode, Printer, Plus, Minus } from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function getQrUrl(tableNumber: number): string {
  const origin = window.location.origin;
  // /order is the customer QR scan route; BASE_URL is the app's base path
  const tableUrl = `${origin}${BASE_URL}/order?table=${tableNumber}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=20&data=${encodeURIComponent(tableUrl)}`;
}

export default function AdminTables() {
  const [tableCount, setTableCount] = useState(10);
  const [printTable, setPrintTable] = useState<number | null>(null);

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintOne = (num: number) => {
    setPrintTable(num);
    setTimeout(() => {
      window.print();
      setPrintTable(null);
    }, 100);
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#print-qr-area) { display: none !important; }
          #print-qr-area { display: block !important; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4; }
        }
        #print-qr-area { display: none; }
      `}</style>

      {/* Hidden print area */}
      <div id="print-qr-area">
        {printTable !== null ? (
          <div style={{ textAlign: 'center', padding: '20mm', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 4, marginBottom: 8 }}>PETUK</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: 2 }}>FIRE & FLAME</div>
            <img src={getQrUrl(printTable)} alt={`Table ${printTable} QR`} style={{ width: 280, height: 280 }} />
            <div style={{ fontSize: 36, fontWeight: 900, marginTop: 16 }}>TABLE {printTable}</div>
            <div style={{ fontSize: 13, marginTop: 8, color: '#555' }}>Scan to order from your table</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8mm', padding: '5mm', fontFamily: 'sans-serif' }}>
            {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => (
              <div key={n} style={{ textAlign: 'center', padding: '6mm', border: '1px solid #ddd', borderRadius: 4, pageBreakInside: 'avoid' }}>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 3, marginBottom: 4 }}>PETUK — TABLE {n}</div>
                <img src={getQrUrl(n)} alt={`Table ${n} QR`} style={{ width: 140, height: 140 }} />
                <div style={{ fontSize: 10, marginTop: 4, color: '#666' }}>Scan to order</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="space-y-6 no-print">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Table QR Codes</h1>
          <Button onClick={handlePrintAll} className="gap-2 bg-[#E53935] hover:bg-[#C62828]">
            <Printer className="w-4 h-4" /> Print All QR Codes
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="font-bold text-sm uppercase tracking-wider">Number of Tables</span>
              <div className="flex items-center gap-3 bg-muted rounded-xl p-2">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setTableCount(c => Math.max(1, c - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="font-black text-xl w-8 text-center">{tableCount}</span>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setTableCount(c => Math.min(50, c + 1))}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">Up to 50 tables</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: tableCount }, (_, i) => i + 1).map(n => (
                <div
                  key={n}
                  className="bg-card border border-border rounded-xl p-3 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
                >
                  <div className="font-display font-black text-xs uppercase tracking-widest text-primary">Table {n}</div>
                  <img
                    src={getQrUrl(n)}
                    alt={`Table ${n} QR Code`}
                    className="w-28 h-28 rounded-lg"
                  />
                  <div className="text-[10px] text-muted-foreground truncate w-full text-center font-mono">
                    /order?table={n}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7 gap-1"
                    onClick={() => handlePrintOne(n)}
                  >
                    <Printer className="w-3 h-3" /> Print
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-muted/50 rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <QrCode className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm mb-1">How it works</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Print QR codes and place them on each table</li>
                    <li>• Customers scan and order directly from their phone — no staff needed</li>
                    <li>• Orders appear instantly in Order Management and Kitchen Display with the table number</li>
                    <li>• Payment is collected at the table (cash on desk)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
