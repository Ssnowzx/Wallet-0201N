
import React, { useEffect, useRef, useMemo } from 'react';
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

interface GraphNode {
  id: string;
  x: number;
  y: number;
  type: 'transaction' | 'address';
  data: Transaction | { address: string; balance: number };
}

interface GraphLink {
  source: string;
  target: string;
  type: 'transaction' | 'validation';
}

interface TransactionGraph2DProps {
  transactions: Transaction[];
}

const TransactionGraph2D: React.FC<TransactionGraph2DProps> = ({ transactions }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    console.log('Processing transactions for 2D graph:', transactions.length);
    
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
      const radius = 150;
      nodeMap.set(address, {
        id: address,
        x: Math.cos(angle) * radius + 200,
        y: Math.sin(angle) * radius + 150,
        type: 'address',
        data: { address, balance: 0 }
      });
    });

    // Create transaction nodes using D3 force simulation
    const simulationNodes = transactions.map(tx => ({ ...tx }));
    const simulationLinks = transactions.flatMap(tx =>
      tx.validates.map(validatedTxId => ({
        source: tx.id,
        target: validatedTxId
      }))
    );

    const simulation = d3.forceSimulation(simulationNodes)
      .force('link', d3.forceLink(simulationLinks).id((d: any) => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(200, 150))
      .force('collision', d3.forceCollide().radius(20))
      .stop();

    for (let i = 0; i < 300; ++i) simulation.tick();

    // Add transaction nodes
    simulationNodes.forEach(tx => {
      nodeMap.set(tx.id, {
        id: tx.id,
        x: tx.x || Math.random() * 400,
        y: tx.y || Math.random() * 300,
        type: 'transaction',
        data: tx
      });

      // Create transaction flow links
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

    return {
      nodes: Array.from(nodeMap.values()),
      links: linkArray
    };
  }, [transactions]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 400;
    const height = 300;

    // Create arrow markers for validation links
    svg.append("defs").selectAll("marker")
      .data(["validation"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#EF4444");

    // Create links
    const linkSelection = svg.selectAll(".link")
      .data(links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", d => d.type === 'validation' ? '#EF4444' : '#3B82F6')
      .attr("stroke-width", d => d.type === 'validation' ? 2 : 1)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", d => d.type === 'validation' ? "url(#arrow-validation)" : "");

    // Create nodes
    const nodeSelection = svg.selectAll(".node")
      .data(nodes)
      .enter().append("circle")
      .attr("class", "node")
      .attr("r", d => {
        if (d.type === 'address') return 8;
        const tx = d.data as Transaction;
        return Math.max(3, Math.min(12, tx.amount / 10));
      })
      .attr("fill", d => {
        if (d.type === 'address') return '#8B5CF6';
        const tx = d.data as Transaction;
        return tx.validated ? '#10B981' : '#F59E0B';
      })
      .attr("stroke", d => selectedNode === d.id ? '#000' : 'none')
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      });

    // Add node labels for transaction amounts
    svg.selectAll(".node-label")
      .data(nodes.filter(n => n.type === 'transaction'))
      .enter().append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", "8px")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .text(d => (d.data as Transaction).amount.toFixed(1));

    // Update positions
    linkSelection
      .attr("x1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode ? sourceNode.x : 0;
      })
      .attr("y1", d => {
        const sourceNode = nodes.find(n => n.id === d.source);
        return sourceNode ? sourceNode.y : 0;
      })
      .attr("x2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        return targetNode ? targetNode.x : 0;
      })
      .attr("y2", d => {
        const targetNode = nodes.find(n => n.id === d.target);
        return targetNode ? targetNode.y : 0;
      });

    nodeSelection
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    svg.selectAll(".node-label")
      .attr("x", d => d.x)
      .attr("y", d => d.y);

  }, [nodes, links, selectedNode]);

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

  return (
    <div className="h-full w-full relative">
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

      <div className="w-full h-full flex flex-col">
        <svg
          ref={svgRef}
          width="100%"
          height="240"
          viewBox="0 0 400 300"
          className="border border-gray-200 rounded-lg bg-white"
        />
        
        <div className="mt-2 bg-white/90 backdrop-blur-md rounded-lg p-2 shadow-lg">
          <p className="text-xs text-gray-600 mb-2">
            Clique nos nós para detalhes
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span>Endereços</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Validadas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span>Pendentes</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Fluxo</span>
            </div>
            <div className="flex items-center space-x-2 col-span-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span>→ Validação</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionGraph2D;
