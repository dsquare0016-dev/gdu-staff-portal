import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Camera, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QRScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    staff?: any;
  } | null>(null);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const startScanner = () => {
    setIsScannerActive(true);
    
    // Small delay to ensure the #reader div is rendered
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );

      async function onScanSuccess(decodedText: string) {
        if (isProcessing) return;
        
        try {
          setIsProcessing(true);
          const data = JSON.parse(decodedText);
          
          if (data.type !== 'GDU_ATTENDANCE') {
            throw new Error('Invalid QR Code type');
          }

          // Record attendance
          const { data: staff, error: staffError } = await supabase
            .from('staff_records')
            .select('*')
            .eq('readable_id', data.staffId)
            .single();

          if (staffError || !staff) {
            throw new Error('Staff record not found');
          }

          const now = new Date();
          const today = now.toISOString().split('T')[0];
          
          // Check if already checked in today
          const { data: existing, error: existingError } = await supabase
            .from('attendance')
            .select('*')
            .eq('staff_id', staff.id)
            .eq('date', today)
            .single();

          if (existing) {
            // Update check-out
            const { error: updateError } = await supabase
              .from('attendance')
              .update({ 
                check_out: now.toLocaleTimeString(),
                status: 'present'
              })
              .eq('id', existing.id);

            if (updateError) throw updateError;
            
            setScanResult({ 
              success: true, 
              message: `Check-out successful for ${staff.full_name}`,
              staff 
            });
            toast.success(`Check-out: ${staff.full_name}`);
          } else {
            // Insert check-in
            const { error: insertError } = await supabase
              .from('attendance')
              .insert([{
                staff_id: staff.id,
                date: today,
                check_in: now.toLocaleTimeString(),
                status: now.getHours() > 9 ? 'late' : 'present'
              }]);

            if (insertError) throw insertError;

            setScanResult({ 
              success: true, 
              message: `Check-in successful for ${staff.full_name}`,
              staff 
            });
            toast.success(`Check-in: ${staff.full_name}`);
          }

        } catch (err: any) {
          console.error('Scan Error:', err);
          setScanResult({ success: false, message: err.message });
          toast.error(err.message);
        } finally {
          setIsProcessing(false);
          // Reset result after 5 seconds
          setTimeout(() => setScanResult(null), 5000);
        }
      }

      scanner.render(onScanSuccess, (err) => {
        // Silently handle scan failures
      });
      
      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error('Failed to clear scanner', e);
      }
    }
    setIsScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error('Failed to clear scanner', e));
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {!isScannerActive ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30 space-y-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold">Attendance Scanner</h3>
            <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
              Click the button below to open your camera and scan a staff QR code.
            </p>
          </div>
          <Button onClick={startScanner} size="lg" className="gap-2">
            <Scan className="h-4 w-4" />
            Open Camera & Scan
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Live Camera Feed
            </h3>
            <Button variant="ghost" size="sm" onClick={stopScanner} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
              <StopCircle className="h-4 w-4" />
              Stop Scanner
            </Button>
          </div>
          
          <div id="reader" className="overflow-hidden rounded-xl border-2 border-primary/20 bg-black aspect-square max-w-[400px] mx-auto"></div>
          
          <div className="bg-muted/50 p-4 rounded-lg border text-center">
            <p className="text-xs text-muted-foreground italic">
              Position the QR code within the square to scan automatically.
            </p>
          </div>
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary">Processing Scan...</span>
        </div>
      )}

      {scanResult && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          scanResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {scanResult.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <div>
            <p className="text-sm font-bold">{scanResult.message}</p>
            {scanResult.staff && (
              <p className="text-xs opacity-80">{scanResult.staff.position} • {scanResult.staff.readable_id}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

