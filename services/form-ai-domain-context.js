const FORM_AI_DOMAIN_CONTEXT = {
    name: 'FANUC / Machine Tool / Manufacturing FORM domain lens',
    purpose: [
        'Use this only as professional interpretation context for FORM evidence.',
        'FORM tool evidence and actual customer text are authoritative.',
        'Domain associations are possible related dimensions, not confirmed customer facts.'
    ],
    industryContext: [
        'FANUC CNC and SERVO are mainly used in machine tools and industrial machinery control.',
        'Relevant domains include machine tool control, industrial automation, IoT, machine connectivity, manufacturing data collection, machine monitoring, Digital Twin, machining simulation, production optimization, and smart manufacturing.',
        'Do not force unrelated evidence into a CNC, SERVO, or FANUC product explanation.'
    ],
    glossary: {
        MTB: 'Machine Tool Builder; machine builder / machine-tool builder perspective.',
        MTU: 'Machine Tool User; factory/user side operating machines for production.',
        SI: 'System Integrator; integrates machines, controllers, robots, PLC, sensors, MES, databases, SCADA, and other systems.',
        MES: 'Manufacturing Execution System; production execution, WIP, traceability, machine status, shop-floor data, quality, production monitoring.',
        ERP: 'Enterprise Resource Planning; enterprise-level finance, procurement, sales, inventory, production, supply chain, cost, and resource management.',
        APS: 'Advanced Planning and Scheduling; production planning, scheduling, capacity, constraints, delivery, priority, and resource allocation.',
        CNC: 'Computer Numerical Control for machine tools.',
        SERVO: 'Motion-control drive/motor/control technology.',
        OEE: 'Overall Equipment Effectiveness.',
        'OPC UA': 'Industrial interoperability / machine connectivity protocol.',
        MTConnect: 'Machine-tool data connectivity standard.',
        'Digital Twin': 'Machine/process simulation, verification, cycle-time evaluation, machining-condition optimization, and reduced trial cutting.',
        IoT: 'Machine connectivity, status/data collection, monitoring, alarms, utilization, and integration.'
    },
    stakeholderPerspectives: {
        MTB: [
            'machine design',
            'CNC functionality',
            'servo and machine performance',
            'machining performance',
            'machine differentiation',
            'development efficiency',
            'commissioning and tuning',
            'UI/customization',
            'cost, delivery, controller supply',
            'Digital Twin and automation integration'
        ],
        MTU: [
            'machining efficiency',
            'Cycle Time',
            'quality and yield',
            'utilization and downtime',
            'machine failure',
            'tool life and tool cost',
            'labor, setup/changeover',
            'production management',
            'machine monitoring',
            'preventive maintenance',
            'ROI'
        ],
        SI: [
            'equipment connectivity',
            'PLC / robot / sensor / controller integration',
            'API and protocol integration',
            'OPC UA / MTConnect / Ethernet',
            'MES / ERP / database / SCADA integration',
            'data collection and factory information flow'
        ]
    },
    semanticAssociations: [
        {
            dimension: 'Machining Efficiency',
            cues: ['cycle time', 'Cycle Time', 'feed rate', 'capacity', 'throughput', 'machining speed', 'production bottleneck'],
            relatedDimensions: ['Cycle Time Optimization', 'Digital Twin', 'Production Capacity']
        },
        {
            dimension: 'Machining Quality',
            cues: ['surface finish', 'accuracy', 'vibration', 'thermal', 'quality variation', 'defect', 'scrap', 'servo tuning'],
            relatedDimensions: ['Machining Accuracy', 'Surface Quality', 'Servo Control', 'Machine Dynamics', 'Tool Condition', 'Machining Parameters', 'Digital Twin']
        },
        {
            dimension: 'Tool Management',
            cues: ['tool life', 'tool management', 'tool offset', 'manual tool tracking', 'tool cost', 'tool replacement'],
            relatedDimensions: ['Tool Management', 'Tool Life Management', 'Setup / Changeover', 'Manufacturing Digitalization']
        },
        {
            dimension: 'Tool Breakage / Wear',
            cues: ['tool breakage', 'tool wear', 'broken tool', 'cutting load', 'spindle load', 'servo load', 'abnormal cutting'],
            relatedDimensions: ['Tool Breakage', 'Tool Wear', 'Cutting Load', 'Abnormal Detection', 'Machine Monitoring', 'Process Monitoring']
        },
        {
            dimension: 'Machine Monitoring',
            cues: ['alarm', 'machine status', 'downtime', 'utilization', 'data collection', 'monitoring', 'machine connectivity', 'equipment status'],
            relatedDimensions: ['Machine Monitoring', 'Machine Connectivity', 'IoT', 'Data Collection', 'Alarm Analysis', 'Utilization', 'Downtime Analysis', 'OEE', 'Condition Monitoring']
        },
        {
            dimension: 'Maintenance / Reliability',
            cues: ['predictive maintenance', 'preventive maintenance', 'condition monitoring', 'machine health', 'servo alarm', 'motor alarm', 'downtime', 'failure'],
            relatedDimensions: ['Condition Monitoring', 'Predictive Maintenance', 'Servo Monitoring', 'Maintenance', 'Machine Health']
        },
        {
            dimension: 'Production Scheduling / APS',
            cues: ['schedule', 'planning', 'capacity', 'machine capacity', 'material constraint', 'delivery', 'order priority', 'resource allocation'],
            relatedDimensions: ['APS', 'Production Scheduling', 'Capacity Planning', 'Resource Allocation']
        },
        {
            dimension: 'Manufacturing IT',
            cues: ['MES', 'ERP', 'traceability', 'WIP', 'shop-floor data', 'production tracking', 'inventory', 'cost', 'supply chain'],
            relatedDimensions: ['MES', 'ERP', 'Production Execution', 'Traceability', 'Enterprise Resource Planning']
        },
        {
            dimension: 'Competitive / Controller Context',
            cues: ['Siemens', 'SINUMERIK', 'HEIDENHAIN', 'Mitsubishi', 'Syntec', 'Delta', 'PC-based CNC', 'Open CNC', 'controller replacement', 'controller cost'],
            relatedDimensions: ['Competitive Intelligence', 'Controller Architecture', 'Controller Standardization']
        }
    ],
    interpretationRules: [
        'Separate confirmed facts, explicit customer problems/needs, and domain-based inference.',
        'Do not present a domain association as a confirmed customer requirement.',
        'Do not infer dissatisfaction, replacement intent, or FANUC product need from a competitor/controller mention unless evidence explicitly supports it.',
        'Do not recommend a product unless the question asks for recommendations and evidence supports the need.',
        'Use relevant dimensions only; do not force every answer to discuss all domain topics.',
        'For simple deterministic questions, keep the answer simple and avoid unnecessary domain discussion.'
    ],
    exhibitionContext: [
        'Machine tool exhibitions often increase relevance of CNC, SERVO, machining, accuracy, Cycle Time, Digital Twin, MTB, MTU, and machine development.',
        'Automation exhibitions often increase relevance of automation, robots, SI, machine connectivity, IoT, data collection, MES, and factory integration.',
        'Semiconductor-related exhibitions may increase relevance of precision, stability, automation, traceability, equipment monitoring, data integration, and production management.',
        'Exhibition context increases analytical sensitivity but does not determine customer needs.'
    ]
};

function plannerDomainContext() {
    return {
        name: FORM_AI_DOMAIN_CONTEXT.name,
        purpose: FORM_AI_DOMAIN_CONTEXT.purpose,
        industryContext: FORM_AI_DOMAIN_CONTEXT.industryContext,
        glossary: FORM_AI_DOMAIN_CONTEXT.glossary,
        semanticAssociations: FORM_AI_DOMAIN_CONTEXT.semanticAssociations.map(entry => ({
            dimension: entry.dimension,
            cues: entry.cues,
            relatedDimensions: entry.relatedDimensions
        })),
        interpretationRules: FORM_AI_DOMAIN_CONTEXT.interpretationRules
    };
}

function finalizerDomainContext() {
    return FORM_AI_DOMAIN_CONTEXT;
}

module.exports = {
    plannerDomainContext,
    finalizerDomainContext
};
