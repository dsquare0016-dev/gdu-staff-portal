import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function QRScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    staff?: any;
  } | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
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
      // Silently handle scan failures (common when moving camera)
    });

    return () => {
      scanner.clear().catch(e => console.error('Failed to clear scanner', e));
    };
  }, []);

  return (
    <div className="space-y-4">
      <div id="reader" className="overflow-hidden rounded-xl border-2 border-primary/20 bg-muted/50"></div>
      
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
