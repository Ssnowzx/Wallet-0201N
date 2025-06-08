
import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import * as d3 from 'd3';

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  validates: string[];
  validated: boolean;
  hash: string;
}

// Extend Transaction to be compatible with D3 SimulationNodeDatum
interface SimulationTransaction extends Transaction, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  z?: number;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'transaction' | 'address';
  data: Transaction | { address: string; balance: number };
}

interface GraphLink {
  source: string;
  target: string;
  type: 'transaction' | 'validation';
}

// D3 link interface for force simulation
interface SimulationLink extends d3.SimulationLinkDatum<SimulationTransaction> {
  source: string | SimulationTransaction;
  target: string | SimulationTransaction;
}

interface TransactionNodeProps {
  node: GraphNode;
  isSelected: boolean;
  onClick: (nodeId: string) => void;
}

const TransactionNode: React.FC<TransactionNodeProps> = ({ node, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && !isSelected) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.01;
    }
  });

  const nodeColor = useMemo(() => {
    if (node.type === 'address') return '#8B5CF6';
    const tx = node.data as Transaction;
    return tx.validated ? '#10B981' : '#F59E0B';
  }, [node]);

  const nodeSize = useMemo(() => {
    if (node.type === 'address') return 0.3;
    const tx = node.data as Transaction;
    return Math.max(0.1, Math.min(0.4, tx.amount / 50));
  }, [node]);

  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick(node.id);
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        scale={isSelected ? 1.5 : 1}
      >
        <sphereGeometry args={[nodeSize, 16, 16]} />
        <meshPhongMaterial 
          color={nodeColor} 
          transparent 
          opacity={isSelected ? 1 : 0.8}
          emissive={isSelected ? nodeColor : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      
      {node.type === 'transaction' && (
        <Text
          position={[0, nodeSize + 0.2, 0]}
          fontSize={0.1}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {(node.data as Transaction).amount.toFixed(2)}
        </Text>
      )}
    </group>
  );
};

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  type: 'transaction' | 'validation';
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ start, end, type }) => {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  const lineColor = type === 'validation' ? '#EF4444' : '#3B82F6';

  return (
    <Line
      points={points}
      color={lineColor}
      lineWidth={type === 'validation' ? 2 : 1}
      transparent
      opacity={0.6}
    />
  );
};

interface Graph3DSceneProps {
  transactions: Transaction[];
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

const Graph3DScene: React.FC<Graph3DSceneProps> = ({ transactions, selectedNode, onNodeSelect }) => {
  const { nodes, links } = useMemo(() => {
    console.log('Processing transactions for 3D graph:', transactions.length);
    
    // Create nodes for transactions and addresses
    const nodeMap = new Map<string, GraphNode>();
    const linkArray: GraphLink[] = [];
    const addressSet = new Set<string>();

    // Collect all unique addresses
    transactions.forEach(tx => {
      addressSet.add(tx.from);
      addressSet.add(tx.to);
    });

    // Create address nodes positioned in a circle
    const addresses = Array.from(addressSet);
    addresses.forEach((address, index) => {
      const angle = (index / addresses.length) * Math.PI * 2;
      const radius = 4;
      nodeMap.set(address, {
        id: address,
        x: Math.cos(angle) * radius,
        y: 0,
        z: Math.sin(angle) * radius,
        type: 'address',
        data: { address, balance: 0 }
      });
    });

    // Convert transactions to simulation-compatible format
    const simulationTransactions: SimulationTransaction[] = transactions.map(tx => ({
      ...tx,
      x: undefined,
      y: undefined,
      z: undefined
    }));

    // Create links for D3 force simulation
    const simulationLinks: SimulationLink[] = [];
    transactions.forEach(tx => {
      // Create validation links between transactions
      tx.validates.forEach(validatedTxId => {
        if (transactions.find(t => t.id === validatedTxId)) {
          simulationLinks.push({
            source: tx.id,
            target: validatedTxId
          });
        }
      });
    });

    // Create and run D3 force simulation for 2D positioning
    const simulation = d3.forceSimulation(simulationTransactions)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(2))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('center', d3.forceCenter(0, 2))
      .force('collision', d3.forceCollide().radius(0.5))
      .stop();

    // Run simulation to completion
    for (let i = 0; i < 300; ++i) simulation.tick();

    // Add transaction nodes with 3D positioning
    simulationTransactions.forEach(tx => {
      nodeMap.set(tx.id, {
        id: tx.id,
        x: tx.x || Math.random() * 4 - 2,
        y: (tx.y || 0) + 2,
        z: Math.random() * 4 - 2,
        type: 'transaction',
        data: {
          id: tx.id,
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          timestamp: tx.timestamp,
          validates: tx.validates,
          validated: tx.validated,
          hash: tx.hash
        }
      });

      // Create links from transaction to addresses
      linkArray.push({
        source: tx.from,
        target: tx.id,
        type: 'transaction'
      });
      linkArray.push({
        source: tx.id,
        target: tx.to,
        type: 'transaction'
      });

      // Create validation links
      tx.validates.forEach(validatedTxId => {
        if (nodeMap.has(validatedTxId) || transactions.find(t => t.id === validatedTxId)) {
          linkArray.push({
            source: tx.id,
            target: validatedTxId,
            type: 'validation'
          });
        }
      });
    });

    console.log('Generated nodes:', nodeMap.size, 'links:', linkArray.length);

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkArray
    };
  }, [transactions]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />
      
      {nodes.map(node => (
        <TransactionNode
          key={node.id}
          node={node}
          isSelected={selectedNode === node.id}
          onClick={onNodeSelect}
        />
      ))}
      
      {links.map((link, index) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (!sourceNode || !targetNode) return null;
        
        return (
          <ConnectionLine
            key={index}
            start={[sourceNode.x, sourceNode.y, sourceNode.z]}
            end={[targetNode.x, targetNode.y, targetNode.z]}
            type={link.type}
          />
        );
      })}
      
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  );
};

interface TransactionGraph3DProps {
  transactions: Transaction[];
}

const TransactionGraph3D: React.FC<TransactionGraph3DProps> = ({ transactions }) => {
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNode(selectedNode === nodeId ? null : nodeId);
  };

  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode) return null;
    
    const transaction = transactions.find(tx => tx.id === selectedNode);
    if (transaction) {
      return {
        type: 'transaction',
        data: transaction
      };
    }
    
    return {
      type: 'address',
      data: { address: selectedNode }
    };
  }, [selectedNode, transactions]);

  console.log('TransactionGraph3D rendering with', transactions.length, 'transactions');

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-lg p-3 shadow-lg max-w-xs">
        <h3 className="text-sm font-semibold mb-2">Legenda do Grafo 3D</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Endereços</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Transações Validadas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Transações Pendentes</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-blue-500"></div>
            <span>Fluxo de Transação</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-red-500"></div>
            <span>Validação</span>
          </div>
        </div>
      </div>

      {selectedNodeInfo && (
        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md rounded-lg p-3 shadow-lg max-w-xs">
          <h3 className="text-sm font-semibold mb-2">Detalhes do Nó</h3>
          {selectedNodeInfo.type === 'transaction' ? (
            <div className="space-y-1 text-xs">
              <p><strong>ID:</strong> {(selectedNodeInfo.data as Transaction).id.slice(0, 12)}...</p>
              <p><strong>Valor:</strong> {(selectedNodeInfo.data as Transaction).amount} 0201N</p>
              <p><strong>Status:</strong> {(selectedNodeInfo.data as Transaction).validated ? 'Validada' : 'Pendente'}</p>
              <p><strong>Valida:</strong> {(selectedNodeInfo.data as Transaction).validates.length} transações</p>
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <p><strong>Endereço:</strong></p>
              <p className="font-mono break-all">{(selectedNodeInfo.data as any).address.slice(0, 20)}...</p>
            </div>
          )}
          <button 
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Fechar
          </button>
        </div>
      )}

      <Canvas camera={{ position: [8, 8, 8], fov: 60 }}>
        <Graph3DScene 
          transactions={transactions}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />
      </Canvas>

      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-lg p-2 shadow-lg">
        <p className="text-xs text-gray-600">
          Arraste para rotacionar • Scroll para zoom • Clique nos nós para detalhes
        </p>
      </div>
    </div>
  );
};

export default TransactionGraph3D;
