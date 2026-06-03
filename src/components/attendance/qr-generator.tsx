import { QRCodeSVG } from 'qrcode.react';

interface QRGeneratorProps {
  staffId: string;
  name: string;
  department: string;
  role: string;
  size?: number;
}

export function QRGenerator({ staffId, name, department, role, size = 128 }: QRGeneratorProps) {
  const data = JSON.stringify({
    staffId,
    name,
    department,
    role,
    type: 'GDU_ATTENDANCE'
  });

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm border">
      <QRCodeSVG 
        value={data} 
        size={size}
        level="H"
        includeMargin={true}
      />
      <div className="text-center mt-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Staff ID</p>
        <p className="text-sm font-mono font-bold text-primary">{staffId}</p>
      </div>
    </div>
  );
}
