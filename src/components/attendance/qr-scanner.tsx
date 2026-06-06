import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Camera, StopCircle, ScanQrCode, AlertTriangle, Keyboard, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function QRScanner() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    staff?: any;
  } | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);

  useEffect(() => {
    // Check if on a secure origin (HTTPS or localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    setIsSecureOrigin(isLocalhost || isHttps);
  }, []);

  const processAttendance = async (staffReadableId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const staffId = staffReadableId.trim().toUpperCase();
      
      if (!staffId) {
        throw new Error('Invalid Staff ID');
      }

      // Record attendance
      const { data: staff, error: staffError } = await supabase
        .from('staff_records')
        .select('*')
        .eq('readable_id', staffId)
        .maybeSingle();

      if (staffError || !staff) {
        throw new Error('Staff record not found with ID: ' + staffId);
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Check if already checked in today
      const { data: existing, error: existingError } = await supabase
        .from('attendance')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        // Update check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({ 
            check_out: now.toISOString(),
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
            check_in: now.toISOString(),
            status: now.getHours() >= 9 && now.getMinutes() > 0 ? 'late' : 'present'
          }]);

        if (insertError) throw insertError;

        setScanResult({ 
          success: true, 
          message: `Check-in successful for ${staff.full_name}`,
          staff 
        });
        toast.success(`Check-in: ${staff.full_name}`);
      }
      
      setManualId(''); // Clear manual input on success

    } catch (err: any) {
      console.error('Attendance Error:', err);
      setScanResult({ success: false, message: err.message });
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
      // Reset result after 5 seconds
      setTimeout(() => setScanResult(null), 5000);
    }
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setCameraError(null);
    setIsScannerActive(true);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        const onScanSuccess = async (decodedText: string) => {
          let staffId = '';
          try {
            const data = JSON.parse(decodedText);
            if (data.type === 'GDU_ATTENDANCE' && data.staffId) {
              staffId = data.staffId;
            }
          } catch (e) {
            staffId = decodedText.trim();
          }
          
          if (staffId) {
            await processAttendance(staffId);
          }
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config, 
          onScanSuccess,
          () => {} 
        );

        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        setCameraError(err.message || 'Could not access camera. Please ensure permissions are granted.');
        setIsInitializing(false);
        setIsScannerActive(false);
        toast.error('Camera access failed');
      }
    }, 200);
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {
        console.error('Failed to stop scanner', e);
      }
    }
    setIsScannerActive(false);
    setIsInitializing(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(e => console.error('Failed to clear scanner', e));
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {!isSecureOrigin && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold">Insecure Origin Detected</p>
            <p>
              Camera access requires HTTPS or localhost. Use the live HTTPS portal link, localhost, or enable browser insecure-origin testing for local network testing.
            </p>
            <code className="block bg-amber-100 p-1 rounded mt-1 select-all">
              chrome://flags/#unsafely-treat-insecure-origin-as-secure
            </code>
            <p className="mt-1">
              Add <span className="font-mono">{window.location.origin}</span> to the allowed list if using Chrome.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
          <TabsTrigger value="scan" className="rounded-lg gap-2">
            <ScanQrCode className="h-4 w-4" />
            QR Scan
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg gap-2">
            <Keyboard className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
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
              <Button onClick={startScanner} size="lg" className="gap-2 rounded-xl px-8 shadow-lg shadow-primary/20" disabled={!isSecureOrigin}>
                <ScanQrCode className="h-4 w-4" />
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
              
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-black aspect-square max-w-[400px] mx-auto shadow-2xl">
                <div id="reader" className="w-full h-full"></div>
                
                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest">Accessing Camera...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card className="border-2 border-dashed bg-muted/30 rounded-xl">
            <CardContent className="p-12 flex flex-col items-center justify-center space-y-6">
              <div className="p-4 bg-primary/10 rounded-full">
                <Keyboard className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center space-y-2 max-w-[300px]">
                <h3 className="text-lg font-bold">Manual Attendance Entry</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the Staff ID (e.g. GDU001) to manually record attendance.
                </p>
              </div>
              <div className="flex w-full max-w-sm gap-2">
                <Input 
                  placeholder="Enter Staff ID (e.g. GDU001)" 
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="h-12 rounded-xl text-center font-bold uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && processAttendance(manualId)}
                />
                <Button 
                  onClick={() => processAttendance(manualId)}
                  disabled={!manualId.trim() || isProcessing}
                  className="h-12 w-12 rounded-xl shrink-0"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {cameraError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-800 text-xs">
          <XCircle className="h-4 w-4 shrink-0" />
          <p>{cameraError}</p>
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary">Processing Attendance...</span>
        </div>
      )}

      {scanResult && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
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
