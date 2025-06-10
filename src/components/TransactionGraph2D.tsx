
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  validates: string[];
  // Changed 'validated' to 'isConfirmedForStats' to match the data structure from useRealTimeStats hook
  isConfirmedForStats: boolean; 
  hash: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'transaction' | 'address';
  data: Transaction | { address: string; balance: number };
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
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

    // Create transaction nodes first
    transactions.forEach((tx, index) => {
      const node: GraphNode = {
        id: tx.id,
        type: 'transaction',
        data: tx,
        // Arrange in a more structured way for Tangle visualization
        x: 100 + (index % 12) * 80,
        y: 100 + Math.floor(index / 12) * 100
      };
      nodeMap.set(tx.id, node);
    });

    // Create validation links (this is the key part for Tangle structure)
    transactions.forEach(tx => {
      tx.validates.forEach(validatedTxId => {
        if (nodeMap.has(validatedTxId)) {
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
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    // Create arrow markers for validation links
    svg.append("defs").selectAll("marker")
      .data(["validation"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#EF4444");

    // Create force simulation for better positioning
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(120).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));

    // Create links
    const linkSelection = svg.selectAll(".link")
      .data(links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", "#EF4444")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .attr("marker-end", "url(#arrow-validation)");

    // Create nodes
    const nodeSelection = svg.selectAll(".node")
      .data(nodes)
      .enter().append("circle")
      .attr("class", "node")
      .attr("r", d => {
        const tx = d.data as Transaction;
        return Math.max(10, Math.min(18, tx.amount / 4));
      })
      .attr("fill", d => {
        const tx = d.data as Transaction;
        // Use isConfirmedForStats to determine color
        return tx.isConfirmedForStats ? '#10B981' : '#F59E0B';
      })
      .attr("stroke", d => selectedNode === d.id ? '#000' : '#fff')
      .attr("stroke-width", d => selectedNode === d.id ? 3 : 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      })
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add node labels
    const labelSelection = svg.selectAll(".node-label")
      .data(nodes)
      .enter().append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .attr("pointer-events", "none")
      .text(d => (d.data as Transaction).amount.toFixed(1));

    // Update positions on simulation tick
    simulation.on("tick", () => {
      linkSelection
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      nodeSelection
        .attr("cx", d => d.x!)
        .attr("cy", d => d.y!);

      labelSelection
        .attr("x", d => d.x!)
        .attr("y", d => d.y!);
    });

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
    
    return null;
  }, [selectedNode, transactions]);

  return (
    <div className="h-full w-full relative">
      {selectedNodeInfo && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-lg p-3 shadow-lg max-w-xs border">
          <h3 className="text-sm font-semibold mb-2">Detalhes da Transação</h3>
          <div className="space-y-1 text-xs">
            <p><strong>ID:</strong> {(selectedNodeInfo.data as Transaction).id.slice(0, 12)}...</p>
            <p><strong>Valor:</strong> {(selectedNodeInfo.data as Transaction).amount} 0201N</p>
            {/* Use isConfirmedForStats in the details display */}
            <p><strong>Status:</strong> {(selectedNodeInfo.data as Transaction).isConfirmedForStats ? '✅ Validada' : '⏳ Pendente'}</p>
            <p><strong>Valida:</strong> {(selectedNodeInfo.data as Transaction).validates.length} transação(ões)</p>
          </div>
          <button 
            onClick={() => setSelectedNode(null)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="w-full h-full flex flex-col">
        <svg
          ref={svgRef}
          width="100%"
          height="480"
          viewBox="0 0 800 600"
          className="border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50"
        />
        
        <div className="mt-2 bg-white/95 backdrop-blur-md rounded-lg p-3 shadow-sm border">
          <p className="text-xs text-gray-600 mb-2 font-medium">
            🔍 Clique nos nós para detalhes • Arraste para reposicionar
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
              <span>Transações Validadas</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
              <span>Transações Pendentes</span>
            </div>
            <div className="flex items-center space-x-2 col-span-2">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <div className="text-red-500">→</div>
              </div>
              <span>Setas de Validação (Tangle DAG)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionGraph2D;
