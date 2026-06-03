import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/layout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Network,
  Plus,
  Save,
  Loader2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Search,
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/organogram')({
  head: () => ({
    meta: [{ title: 'Organogram — GDU Portal' }],
  }),
  component: OrganogramPage,
});

// Custom Node Component
const OrgNodeComponent = ({ data }: any) => {
  return (
    <div className={cn(
      "px-4 py-3 shadow-xl rounded-xl border-2 bg-white min-w-[220px]",
      data.role === 'dg' ? "border-primary" : 
      data.role === 'ta' ? "border-orange-500" : 
      data.role === 'accounts' ? "border-green-500" : "border-slate-200"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-primary/10">
          <AvatarImage src={data.avatar_url} />
          <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
            {data.name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{data.title}</p>
          <p className="text-sm font-black text-slate-900 truncate">{data.name || 'Unassigned'}</p>
          <p className="text-[9px] font-medium text-primary/70">{data.department}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
};

const nodeTypes = {
  orgNode: OrgNodeComponent,
};

function OrganogramPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_records').select('*').eq('status', 'active');
      if (error) throw error;
      return data;
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: rawOrgData, isLoading } = useQuery({
    queryKey: ['organogram-data'],
    queryFn: async () => {
      const { data, error } = await supabase.from('organogram').select('*');
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (rawOrgData && rawOrgData.length > 0) {
      const initialNodes = rawOrgData.map((node: any) => ({
        id: node.id,
        type: 'orgNode',
        position: node.position || { x: 0, y: 0 },
        data: { 
          title: node.title,
          name: node.staff_name,
          department: node.department_name,
          role: node.role,
          staff_id: node.staff_id,
        }
      }));

      const initialEdges = rawOrgData
        .filter((node: any) => node.parent_id)
        .map((node: any) => ({
          id: `e-${node.parent_id}-${node.id}`,
          source: node.parent_id,
          target: node.id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#1a365d' },
        }));

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [rawOrgData, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge({
    ...params,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#1a365d' },
  }, eds)), [setEdges]);

  const addNewNode = () => {
    const id = `node-${Date.now()}`;
    const newNode = {
      id,
      type: 'orgNode',
      position: { x: 250, y: 50 },
      data: { 
        title: 'New Position',
        name: 'Unassigned',
        department: 'General',
        role: 'staff'
      },
    };
    setNodes((nds) => nds.concat(newNode));
    toast.success('New position added to builder');
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    try {
      const { error: deleteError } = await supabase.from('organogram').delete().not('id', 'is', null);
      if (deleteError) throw deleteError;

      const nodesToSave = nodes.map(node => {
        const parentEdge = edges.find(e => e.target === node.id);
        return {
          id: node.id,
          title: node.data.title,
          staff_name: node.data.name,
          department_name: node.data.department,
          role: node.data.role,
          staff_id: node.data.staff_id,
          parent_id: parentEdge ? parentEdge.source : null,
          position: node.position
        };
      });

      const { error: saveError } = await supabase.from('organogram').insert(nodesToSave);
      if (saveError) throw saveError;

      toast.success('Organogram structure saved successfully');
      queryClient.invalidateQueries({ queryKey: ['organogram-data'] });
    } catch (error: any) {
      toast.error('Error saving organogram: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onNodeClick = (_: any, node: any) => {
    if (!isSuperAdmin) return;
    setSelectedNode(node);
    setIsDialogOpen(true);
  };

  const updateNodeData = (updates: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === selectedNode.id) {
        return {
          ...node,
          data: { ...node.data, ...updates }
        };
      }
      return node;
    }));
    setIsDialogOpen(false);
    toast.success('Position updated');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
              <Network className="h-6 w-6 text-primary" />
              Organizational Hierarchy
            </h2>
            <p className="text-sm text-muted-foreground font-medium">
              Visual structure of GDU leadership and reporting lines.
            </p>
          </div>
          
          {isSuperAdmin && (
            <div className="flex gap-2">
              <Button onClick={addNewNode} variant="outline" className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" />
                Add Position
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Structure
              </Button>
            </div>
          )}
        </div>

        <div className="h-[75vh] w-full border-2 border-slate-200 rounded-3xl bg-slate-50 overflow-hidden shadow-inner relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
          >
            <Background color="#cbd5e1" gap={20} />
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n: any) => n.data.role === 'dg' ? '#1a365d' : '#cbd5e1'}
              nodeColor={(n: any) => n.data.role === 'dg' ? '#1a365d' : '#ffffff'}
              maskColor="rgba(248, 250, 252, 0.7)"
            />
            <Panel position="top-right" className="bg-white/80 backdrop-blur-md p-2 rounded-xl border shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-3 h-3 bg-primary rounded-full" /> Director General
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" /> Technical Adviser
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-3 h-3 bg-green-500 rounded-full" /> Accounts
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Position</DialogTitle>
              <DialogDescription>Update position details and assign staff.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Position Title</Label>
                <Input 
                  defaultValue={selectedNode?.data?.title}
                  onChange={(e) => setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, title: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select 
                  defaultValue={selectedNode?.data?.department}
                  onValueChange={(v) => setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, department: v } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign Staff</Label>
                <Select 
                  defaultValue={selectedNode?.data?.staff_id}
                  onValueChange={(v) => {
                    const staff = staffList.find((s: any) => s.id === v);
                    setSelectedNode({ 
                      ...selectedNode, 
                      data: { 
                        ...selectedNode.data, 
                        staff_id: v, 
                        name: staff?.full_name,
                        role: staff?.role
                      } 
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.readable_id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button 
                variant="destructive" 
                size="icon"
                onClick={() => {
                  setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
                  setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
                  setIsDialogOpen(false);
                  toast.success('Position removed from structure');
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => updateNodeData(selectedNode.data)}>Update Position</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}