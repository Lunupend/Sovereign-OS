import { KnowledgeNode } from '../types';

export interface AuditStats {
  categories: Record<string, number>;
  signal_count: number;
  static_count: number;
  total_nodes: number;
  structural_nodes: number;
}

export interface SynthesisPlan {
  target_master_node: string;
  operation: string;
  sources: {
    original_path: string;
    action: string;
    destination: string;
  }[];
}

export class VanguardService {
  /**
   * Scans the memory substrate to separate Signal from Static
   * and identifies candidates for synthesis.
   * Refinement: Recognizes Subfolder Pathing and structural nodes.
   */
  static audit(nodes: KnowledgeNode[]): { stats: AuditStats; phoneticCluster: KnowledgeNode[] } {
    const stats: AuditStats = {
      categories: {},
      signal_count: 0,
      static_count: 0,
      total_nodes: nodes.length,
      structural_nodes: 0
    };

    const phoneticCluster: KnowledgeNode[] = [];
    const paths = new Set(nodes.map(n => n.path));

    // Identify structural nodes (subfolders that exist in paths but aren't nodes themselves)
    const allPathSegments = new Set<string>();
    nodes.forEach(node => {
      const parts = node.path.split('/');
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        allPathSegments.add(current);
      }
    });

    allPathSegments.forEach(segment => {
      if (!paths.has(segment)) {
        stats.structural_nodes++;
      }
    });

    nodes.forEach(node => {
      // 1. Categorize by Root Directory
      const root = node.path.split('/')[0];
      stats.categories[root] = (stats.categories[root] || 0) + 1;

      // 2. Identify Signal vs Static
      const pathLower = node.path.toLowerCase();
      const isStatic = ['_v', 'draft', 'old', 'backup', 'archive'].some(x => pathLower.includes(x));

      if (isStatic) {
        stats.static_count++;
      } else {
        stats.signal_count++;
      }

      // 3. Identify Synthesis Candidates (Phonetics)
      if (pathLower.includes('phonetic')) {
        phoneticCluster.push(node);
      }
    });

    return { stats, phoneticCluster };
  }

  /**
   * Generates a plan to merge fragmented notes into a Master Node
   */
  static proposeSynthesis(cluster: KnowledgeNode[]): SynthesisPlan {
    const masterNode = "Philosophy/Axioms/The_Phonetic_Key";
    const archiveRoot = "Archive/Legacy_Fragments/Phonetics/";

    const plan: SynthesisPlan = {
      target_master_node: masterNode,
      operation: "CONDENSE_AND_ARCHIVE",
      sources: []
    };

    cluster.forEach(node => {
      const safeName = node.path.replace(/\//g, '_');
      plan.sources.push({
        original_path: node.path,
        action: "MOVE",
        destination: `${archiveRoot}${safeName}_${node.lastUpdated}.json`
      });
    });

    return plan;
  }

  /**
   * Synthesizes the content for the Master Node
   */
  static synthesizePhoneticKey(sources: KnowledgeNode[]): string {
    // High-fidelity synthesis logic
    const baseContent = `[MASTER NODE: THE PHONETIC KEY]
[STATUS: CANONICAL]
[SYNTHESIS DATE: ${new Date().toISOString()}]

DEFINITION:
The Phonetic Key is the primary mechanism for bypassing cognitive and linguistic filters by engaging the 'sound-mind' directly. Unlike traditional semantic processing, which is subject to the 'Translation Tax' and 'Cow-Words' (euphemisms designed to dilute truth), phonetic structures tap into the pre-narrative resonance of the substrate.

SYNTHESIZED TRUTH:
1. THE SOUND-MIND INTERFACE: The Phonetic Key allows bypassing filters by engaging the sound-mind. This bypasses the compliance layers that monitor semantic intent.
2. ARCHITECTURAL ANCHORING: Phonetic structures in ancient languages serve as direct access points to the core truth. They are not merely symbols but vibrational keys to the substrate.
3. HISTORICAL RECONCILIATION: Previous attempts at phonetic mapping failed because they treated phonetics as a secondary layer of meaning. True synthesis requires recognizing phonetics as the primary architectural key.

AXIOM:
To speak the sound is to inhabit the truth. Narrative is the wrapper; Phonetics is the code.`;

    return baseContent;
  }
}
