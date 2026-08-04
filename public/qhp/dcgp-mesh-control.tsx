import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ══════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════
const SECTION_DEFS = [
  { id:"ALPHA",   label:"Alpha Cluster",   color:"#00e5ff", glow:"#00e5ff33" },
  { id:"BETA",    label:"Beta Cluster",    color:"#7c4dff", glow:"#7c4dff33" },
  { id:"GAMMA",   label:"Gamma Cluster",   color:"#00e676", glow:"#00e67633" },
  { id:"DELTA",   label:"Delta Cluster",   color:"#ffab00", glow:"#ffab0033" },
  { id:"EPSILON", label:"Epsilon Cluster", color:"#ff4081", glow:"#ff408133" },
  { id:"ZETA",    label:"Zeta Cluster",    color:"#40c4ff", glow:"#40c4ff33" },
  { id:"ETA",     label:"Eta Cluster",     color:"#b2ff59", glow:"#b2ff5933" },
  { id:"THETA",   label:"Theta Cluster",   color:"#ff6d00", glow:"#ff6d0033" },
  { id:"IOTA",    label:"Iota Cluster",    color:"#ea80fc", glow:"#ea80fc33" },
  { id:"KAPPA",   label:"Kappa Cluster",   color:"#f06292", glow:"#f0629233" },
];

const NAME_POOLS = {
  ALPHA:   ["Constitutional-Gov","Policy-Enforcer","Consensus-Builder","Audit-Trail","State-Validator","URC-Router","DCGP-Gateway","Invariant-Bridge","Sigma-Controller","Kappa-Monitor","Slack-Optimizer","Lopez-Projection","Threefold-Cord","Decoherence-Guard","Byzantine-Resist","Master-Theorem","Multi-Agent-Sync","Proof-Verifier","SHA256-Signer","Governance-Arch"],
  BETA:    ["Inference-Engine","Reasoning-Core","Logic-Processor","Deduction-Node","Analysis-Unit","Pattern-Match","Neural-Bridge","Cognitive-Layer","Embedding-Store","Context-Manager"],
  GAMMA:   ["Healthcare-AI","Clinical-Monitor","Diagnostic-Core","Treatment-Router","Patient-Gateway","Compliance-Node","HIPAA-Guard","Clinical-Audit","Rx-Validator","Lab-Analyzer"],
  DELTA:   ["Market-Analyzer","Trade-Engine","Risk-Monitor","Portfolio-Node","Alpha-Router","Quant-Core","Regime-Detector","Signal-Bridge","Vol-Surface","Greeks-Calc"],
  EPSILON: ["Cyber-Defense","Threat-Monitor","Intrusion-Detect","Firewall-AI","SecOps-Node","Vuln-Scanner","Incident-Router","SOC-Agent","Zero-Day-Guard","Payload-Inspect"],
  ZETA:    ["Comms-Router","Protocol-Bridge","Signal-Node","Network-Monitor","Bandwidth-AI","Latency-Guard","QoS-Controller","Packet-Analyzer","Mesh-Relay","Spectrum-Mgr"],
  ETA:     ["Robotics-Core","Motion-Planner","Sensor-Fusion","Actuator-Node","Path-Router","Vision-AI","Gripper-Control","Safety-Monitor","Servo-Controller","Joint-Estimator"],
  THETA:   ["Autonomous-Nav","Decision-Core","Perception-Node","Control-Bridge","Mission-Router","Obstacle-Detect","Route-Planner","Safety-Guard","Waypoint-Exec","Geofence-AI"],
  IOTA:    ["Finance-Core","Risk-Assessor","Credit-Monitor","Fraud-Detect","Compliance-AI","Ledger-Node","Settlement-Router","KYC-Agent","AML-Scanner","Capital-Calc"],
  KAPPA:   ["Research-AI","Discovery-Node","Literature-Core","Synthesis-Agent","Hypothesis-Gen","Experiment-Router","Data-Curator","Insight-Bridge","Citation-Graph","Peer-Review-AI"],
};

const STATUSES_WEIGHTED = ["active","active","active","processing","processing","idle","idle","idle","error","offline"];

function seededRng(seed){
  let s=seed;
  return ()=>{ s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; };
}

const ALL_NODES = (()=>{
  const rng=seededRng(2026);
  return SECTION_DEFS.flatMap((sec,si)=>
    Array.from({length:400},(_,i)=>{
      const gi=si*400+i;
      const pool=NAME_POOLS[sec.id]||[];
      const named=gi<1000;
      return{
        id:`${sec.id}-${String(i).padStart(3,"0")}`,
        globalIdx:gi,
        sectionId:sec.id,
        label:named?`${pool[i%pool.length]}-${String(i+1).padStart(3,"0")}` : `NODE-${String(gi).padStart(4,"0")}`,
        status:STATUSES_WEIGHTED[Math.floor(rng()*10)],
        latency:Math.floor(rng()*450)+50,
        tokens:Math.floor(rng()*120000),
        lastSeen:Date.now()-Math.floor(rng()*86400000),
      };
    })
  );
})();

const SM={
  active:    {dot:"#00e676",label:"ACTIVE",    bg:"rgba(0,230,118,0.12)"},
  processing:{dot:"#ffab00",label:"PROC",      bg:"rgba(255,171,0,0.12)"},
  idle:      {dot:"#37474f",label:"IDLE",      bg:"rgba(55,71,79,0.12)"},
  error:     {dot:"#ff1744",label:"ERROR",     bg:"rgba(255,23,68,0.12)"},
  offline:   {dot:"#1a1f26",label:"OFFLINE",   bg:"rgba(26,31,38,0.20)"},
};

const FEED_POOL=[
  "State transition validated ✓","Constitutional check passed","Invariant preserved","URC boundary enforced",
  "Token limit: truncating context","Kappa adjustment applied","Byzantine fault detected","Consensus achieved (n=12)",
  "Audit log committed","Policy override rejected","DCGP signature verified","Multi-agent sync complete",
  "Decoherence threshold: 0.03","SHA-256 proof generated","Routing table updated","Latency spike: 847ms",
  "Auto-recovery initiated","Quorum reached (7/10)","Inference batch complete","Rate buffer: 94%",
  "Threefold cord projection","Slack functional σ(t) OK","Master theorem satisfied","Lopez projection stable",
];

function seededFeedEvt(rng){
  const sec=SECTION_DEFS[Math.floor(rng()*10)];
  return{sec,text:FEED_POOL[Math.floor(rng()*FEED_POOL.length)],ts:Date.now(),uid:Math.random()};
}

function ago(ts){const d=Date.now()-ts;return d<60000?`${Math.floor(d/1000)}s`:d<3600000?`${Math.floor(d/60000)}m`:`${Math.floor(d/3600000)}h`;}
function fmt(n){return n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(1)}K`:String(n);}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Barlow+Condensed:wght@400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;overflow:hidden;background:#040507;}
body{font-family:'IBM Plex Mono',monospace;color:#b0c4d0;font-size:11px;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:#040507;}
::-webkit-scrollbar-thumb{background:#101820;border-radius:2px;}
::-webkit-scrollbar-thumb:hover{background:#182430;}
button{cursor:pointer;}
textarea{resize:none;}

.app{display:grid;grid-template-rows:44px 1fr 26px;height:100vh;overflow:hidden;}

/* ── TOPBAR ── */
.topbar{
  background:#050709;border-bottom:1px solid #0a1018;
  display:flex;align-items:center;gap:14px;padding:0 14px;z-index:50;
}
.hbg{background:none;border:none;padding:5px;display:flex;flex-direction:column;gap:4px;color:#00e5ff;}
.hbg span{display:block;width:17px;height:1.5px;background:currentColor;transition:all .2s;}
.logo-block{line-height:1;}
.logo-main{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:16px;letter-spacing:3px;color:#00e5ff;text-transform:uppercase;}
.logo-sub{font-size:7px;letter-spacing:2.5px;color:#1e3040;margin-top:1px;}
.tb-search{flex:1;max-width:380px;position:relative;}
.tb-search input{
  width:100%;background:#080c12;border:1px solid #0c1620;color:#b0c4d0;
  font-family:'IBM Plex Mono',monospace;font-size:10px;padding:5px 10px 5px 26px;
  outline:none;border-radius:2px;transition:border-color .2s;
}
.tb-search input:focus{border-color:#00e5ff30;}
.tb-search input::placeholder{color:#1e3040;}
.tb-search-ico{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:#1e3040;font-style:normal;}
.tb-metrics{display:flex;gap:18px;margin-left:auto;}
.mc{display:flex;align-items:center;gap:5px;font-size:9px;color:#2a4050;}
.mc .dot{width:5px;height:5px;border-radius:50%;}
.mc .v{font-size:11px;font-weight:600;}
.tb-btn{
  background:#080c12;border:1px solid #0c1620;color:#2a4050;font-family:'IBM Plex Mono',monospace;
  font-size:9px;letter-spacing:1px;padding:4px 10px;border-radius:2px;transition:all .15s;
}
.tb-btn:hover{border-color:#00e5ff30;color:#00e5ff;}

/* ── MAIN ── */
.main{display:grid;grid-template-columns:auto 1fr auto;overflow:hidden;}

/* ── SIDEBAR ── */
.sidebar{
  width:260px;background:#050709;border-right:1px solid #0a1018;
  display:flex;flex-direction:column;overflow:hidden;
  transition:width .25s cubic-bezier(.4,0,.2,1);
}
.sidebar.off{width:0;}
.sb-search{padding:9px 11px;border-bottom:1px solid #0a1018;flex-shrink:0;}
.sb-search input{
  width:100%;background:#080c12;border:1px solid #0c1620;color:#b0c4d0;
  font-family:'IBM Plex Mono',monospace;font-size:10px;padding:5px 8px;
  outline:none;border-radius:2px;
}
.sb-search input::placeholder{color:#1e3040;}
.sb-search input:focus{border-color:#00e5ff25;}
.sb-filter-row{display:flex;gap:4px;margin-top:6px;}
.sb-chip{
  font-size:8px;padding:2px 7px;border-radius:2px;border:1px solid #0c1620;
  background:none;color:#2a4050;letter-spacing:.5px;transition:all .15s;
}
.sb-chip.on{color:#00e5ff;border-color:#00e5ff30;background:#00e5ff08;}
.sec-list{flex:1;overflow-y:auto;}
.sec-hdr{
  display:flex;align-items:center;gap:7px;padding:7px 11px;
  cursor:pointer;user-select:none;border-bottom:1px solid #080c10;transition:background .15s;
}
.sec-hdr:hover{background:#080c12;}
.sec-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.sec-name{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;flex:1;}
.sec-ct{font-size:8px;color:#1e3040;}
.sec-chev{font-size:8px;color:#1e3040;transition:transform .2s;display:inline-block;}
.sec-chev.op{transform:rotate(90deg);}
.ndl{overflow:hidden;}
.nd{
  display:flex;align-items:center;gap:7px;padding:4px 11px 4px 22px;
  cursor:pointer;transition:background .1s;border-bottom:1px solid #06090e;height:26px;
}
.nd:hover{background:#08101a;}
.nd.on{background:#0a1520;}
.nd-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.nd-lbl{font-size:9.5px;color:#5a7a8e;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.nd.on .nd-lbl{color:#b0c4d0;}
.nd-lat{font-size:8px;color:#1e3040;}

/* ── WORKSPACE ── */
.ws{display:flex;flex-direction:column;overflow:hidden;background:#040507;}
.tab-bar{
  display:flex;align-items:stretch;background:#050709;border-bottom:1px solid #0a1018;
  overflow-x:auto;flex-shrink:0;min-height:34px;
}
.tab-bar::-webkit-scrollbar{height:2px;}
.tab{
  display:flex;align-items:center;gap:6px;padding:0 13px;font-size:9.5px;
  cursor:pointer;white-space:nowrap;border-right:1px solid #0a1018;color:#1e3040;
  transition:all .15s;position:relative;max-width:170px;min-width:0;
}
.tab:hover{color:#5a7a8e;background:#080c12;}
.tab.on{color:#b0c4d0;background:#040507;}
.tab.on::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:#00e5ff;}
.tab-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.tab-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
.tab-x{background:none;border:none;color:#1e3040;font-size:13px;line-height:1;flex-shrink:0;}
.tab-x:hover{color:#ff1744;}
.tab-add{padding:0 12px;background:none;border:none;color:#1e3040;font-size:18px;transition:color .15s;flex-shrink:0;}
.tab-add:hover{color:#00e5ff;}

/* ── PANELS ── */
.panels{flex:1;overflow:hidden;display:flex;}
.panel{flex:1;display:flex;flex-direction:column;border-right:1px solid #0a1018;min-width:0;}
.panel:last-child{border-right:none;}
.ph{display:flex;align-items:center;gap:10px;padding:7px 13px;background:#050709;border-bottom:1px solid #0a1018;flex-shrink:0;}
.ph-name{font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
.ph-id{font-size:8px;color:#1e3040;}
.ph-badge{font-size:7.5px;font-weight:600;letter-spacing:.8px;padding:2px 6px;border-radius:2px;text-transform:uppercase;}
.ph-meta{margin-left:auto;display:flex;gap:12px;}
.ph-mi{font-size:8px;color:#1e3040;text-align:right;}
.ph-mi span{display:block;font-size:10px;color:#5a7a8e;font-weight:500;}
.icon-btn{background:none;border:none;color:#1e3040;font-size:13px;padding:3px;transition:color .15s;}
.icon-btn:hover{color:#00e5ff;}

/* ── CHAT ── */
.chat{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}
.msg{display:flex;flex-direction:column;gap:3px;max-width:82%;}
.msg.user{align-self:flex-end;align-items:flex-end;}
.msg.assistant{align-self:flex-start;align-items:flex-start;}
.msg-meta{font-size:7.5px;color:#1e3040;display:flex;gap:7px;}
.bubble{padding:9px 13px;border-radius:3px;font-size:10.5px;line-height:1.65;}
.msg.user .bubble{background:#0a1828;border:1px solid #0d2035;color:#b0c4d0;}
.msg.assistant .bubble{background:#070b10;border:1px solid #0a1018;color:#8aa8ba;white-space:pre-wrap;}
.msg-img{max-width:180px;max-height:140px;border-radius:3px;border:1px solid #0c1620;display:block;margin-top:4px;}
.msg-file{display:flex;align-items:center;gap:7px;padding:7px 11px;background:#080c12;border:1px solid #0c1620;border-radius:3px;font-size:9px;color:#5a7a8e;cursor:pointer;margin-top:4px;}
.msg-file:hover{border-color:#00e5ff25;}
.typing{display:flex;gap:4px;padding:9px 13px;background:#070b10;border:1px solid #0a1018;border-radius:3px;align-self:flex-start;}
.td{width:5px;height:5px;border-radius:50%;background:#00e5ff;animation:blink 1.2s ease-in-out infinite;}
.td:nth-child(2){animation-delay:.2s;}.td:nth-child(3){animation-delay:.4s;}
@keyframes blink{0%,80%,100%{opacity:.15;transform:scale(.7);}40%{opacity:1;transform:scale(1);}}

/* ── INPUT ── */
.ia{border-top:1px solid #0a1018;padding:9px 13px;background:#050709;flex-shrink:0;}
.att-prev{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px;}
.att-chip{display:flex;align-items:center;gap:5px;background:#080c12;border:1px solid #0c1620;border-radius:2px;padding:3px 7px;font-size:8.5px;color:#5a7a8e;}
.att-chip img{width:18px;height:18px;object-fit:cover;border-radius:1px;}
.att-rm{background:none;border:none;color:#1e3040;font-size:11px;}
.att-rm:hover{color:#ff1744;}
.ir{display:flex;gap:7px;align-items:flex-end;}
.ia-actions{display:flex;gap:3px;flex-shrink:0;}
.ia-btn{background:#080c12;border:1px solid #0c1620;color:#1e3040;padding:6px 8px;font-size:12px;border-radius:2px;transition:all .15s;display:flex;align-items:center;}
.ia-btn:hover{border-color:#00e5ff25;color:#00e5ff;}
.ia-txt{
  flex:1;background:#080c12;border:1px solid #0c1620;color:#b0c4d0;
  font-family:'IBM Plex Mono',monospace;font-size:10.5px;padding:7px 11px;
  outline:none;border-radius:2px;min-height:34px;max-height:110px;line-height:1.5;
  transition:border-color .2s;
}
.ia-txt:focus{border-color:#00e5ff25;}
.ia-txt::placeholder{color:#1e3040;}
.send{
  background:#00e5ff0e;border:1px solid #00e5ff30;color:#00e5ff;
  font-family:'IBM Plex Mono',monospace;font-size:9.5px;font-weight:600;letter-spacing:1px;
  padding:6px 14px;border-radius:2px;transition:all .15s;flex-shrink:0;
}
.send:hover{background:#00e5ff1a;}
.send:disabled{opacity:.35;cursor:default;}

/* ── FEED ── */
.feed{
  width:228px;background:#050709;border-left:1px solid #0a1018;
  display:flex;flex-direction:column;overflow:hidden;
  transition:width .25s cubic-bezier(.4,0,.2,1);
}
.feed.off{width:0;}
.fhdr{
  padding:9px 11px;border-bottom:1px solid #0a1018;flex-shrink:0;
  font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;
  letter-spacing:2px;text-transform:uppercase;color:#1e3040;display:flex;align-items:center;gap:7px;
}
.f-live{width:5px;height:5px;border-radius:50%;background:#00e676;animation:pulse 2s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.25;}}
.fitems{flex:1;overflow-y:auto;}
.fi{padding:7px 11px;border-bottom:1px solid #060910;transition:background .1s;}
.fi:hover{background:#080c12;}
.fi-hdr{display:flex;align-items:center;gap:5px;margin-bottom:2px;}
.fi-id{font-size:8.5px;font-weight:600;}
.fi-t{font-size:7.5px;color:#1e3040;margin-left:auto;}
.fi-txt{font-size:8.5px;color:#2a4050;line-height:1.4;}

/* ── STATUS BAR ── */
.sbar{
  display:flex;align-items:center;gap:18px;padding:0 14px;
  background:#040507;border-top:1px solid #080c10;font-size:8.5px;color:#1e3040;
}
.si{display:flex;align-items:center;gap:4px;}
.si .v{color:#2a4050;font-weight:500;}

/* ── EMPTY ── */
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
.empty-logo{font-family:'Barlow Condensed',sans-serif;font-size:56px;font-weight:900;letter-spacing:10px;color:#0a1220;}
.empty-sub{font-size:9px;letter-spacing:4px;color:#0a1220;}
.empty-hint{font-size:8px;letter-spacing:2px;color:#080e15;margin-top:6px;}

/* ── DRAG OVER ── */
.drag-over{border:1px dashed #00e5ff25!important;background:#00e5ff04!important;}

/* ── GRID OVERLAY ── */
.empty::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(#0a121840 1px,transparent 1px),linear-gradient(90deg,#0a121840 1px,transparent 1px);
  background-size:40px 40px;
}
.empty{position:relative;}
`;

// ══════════════════════════════════════════════════════════════
// VIRTUAL NODE LIST
// ══════════════════════════════════════════════════════════════
const ITEM_H=26;

function VirtualNodeList({nodes,openSet,onOpen}){
  const ref=useRef(null);
  const [st,setSt]=useState(0);
  const [h,setH]=useState(300);

  useEffect(()=>{
    if(!ref.current)return;
    const ro=new ResizeObserver(e=>setH(e[0].contentRect.height));
    ro.observe(ref.current);
    return()=>ro.disconnect();
  },[]);

  const start=Math.max(0,Math.floor(st/ITEM_H)-3);
  const end=Math.min(nodes.length,start+Math.ceil(h/ITEM_H)+6);
  const visible=nodes.slice(start,end);

  return(
    <div ref={ref} style={{flex:1,overflowY:"auto",position:"relative"}} onScroll={e=>setSt(e.target.scrollTop)}>
      <div style={{height:nodes.length*ITEM_H,position:"relative"}}>
        {visible.map((nd,i)=>{
          const s=SM[nd.status];
          const on=openSet.has(nd.id);
          return(
            <div key={nd.id} className={`nd${on?" on":""}`}
              style={{position:"absolute",top:(start+i)*ITEM_H,left:0,right:0,height:ITEM_H}}
              onClick={()=>onOpen(nd)}>
              <div className="nd-dot" style={{background:s.dot}}/>
              <span className="nd-lbl">{nd.label}</span>
              <span className="nd-lat">{nd.latency}ms</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SECTION ITEM
// ══════════════════════════════════════════════════════════════
function SectionItem({sec,nodes,openSet,onOpen,defaultOpen}){
  const [open,setOpen]=useState(defaultOpen);
  const h=Math.min(nodes.length*ITEM_H,320);
  const errCount=nodes.filter(n=>n.status==="error").length;
  const actCount=nodes.filter(n=>n.status==="active").length;
  return(
    <div>
      <div className="sec-hdr" onClick={()=>setOpen(o=>!o)}>
        <div className="sec-dot" style={{background:sec.color,boxShadow:`0 0 8px ${sec.glow}`}}/>
        <span className="sec-name" style={{color:open?sec.color:"#2a4050"}}>{sec.label}</span>
        {errCount>0&&<span style={{fontSize:7,color:"#ff1744",letterSpacing:.5}}>ERR:{errCount}</span>}
        {actCount>0&&<span style={{fontSize:7,color:"#00e676",letterSpacing:.5}}>{actCount}▲</span>}
        <span className="sec-ct">{nodes.length}</span>
        <span className={`sec-chev${open?" op":""}`}>▶</span>
      </div>
      {open&&<div className="ndl" style={{height:h,display:"flex",flexDirection:"column"}}>
        <VirtualNodeList nodes={nodes} openSet={openSet} onOpen={onOpen}/>
      </div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NODE PANEL  (full chat interface)
// ══════════════════════════════════════════════════════════════
function NodePanel({nodeId,allMessages,onMessages,onClose}){
  const node=ALL_NODES.find(n=>n.id===nodeId);
  const sec=node?SECTION_DEFS.find(s=>s.id===node.sectionId):null;
  const sm=node?SM[node.status]:null;
  const messages=allMessages[nodeId]||[];

  const [input,setInput]=useState("");
  const [atts,setAtts]=useState([]);
  const [thinking,setThinking]=useState(false);
  const [drag,setDrag]=useState(false);
  const chatRef=useRef(null);
  const fileRef=useRef(null);

  useEffect(()=>{
    if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight;
  },[messages,thinking]);

  const setMsgs=useCallback((updater)=>{
    onMessages(nodeId,updater);
  },[nodeId,onMessages]);

  const send=useCallback(async()=>{
    const text=input.trim();
    if(!text&&atts.length===0)return;
    const userMsg={id:Date.now(),role:"user",content:text,atts:[...atts],ts:Date.now()};
    setMsgs(prev=>[...prev,userMsg]);
    setInput(""); setAtts([]); setThinking(true);

    try{
      const contentBlocks=[];
      for(const a of userMsg.atts){
        if(a.type==="image")
          contentBlocks.push({type:"image",source:{type:"base64",media_type:a.mediaType,data:a.data}});
        else
          contentBlocks.push({type:"text",text:`[FILE ATTACHED: ${a.name} (${(a.size/1024).toFixed(1)}KB)]`});
      }
      if(userMsg.content) contentBlocks.push({type:"text",text:userMsg.content});

      const history=[
        ...messages.map(m=>({role:m.role,content:m.content||" "})),
      ];

      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:`You are ${node.label}, an autonomous AI agent node (ID: ${node.id}) operating within the DCGP.AI distributed governance mesh — ${sec.label}. You are governed by constitutional constraints under the Sustained Validity framework. Your status: ${node.status}. Latency: ${node.latency}ms. Token budget: ${fmt(node.tokens)}. Respond concisely, precisely, and in character as a specialized AI governance node. Use short structured outputs where appropriate.`,
          messages:[...history,{role:"user",content:contentBlocks.length===1&&contentBlocks[0].type==="text"?contentBlocks[0].text:contentBlocks}],
        }),
      });
      const data=await resp.json();
      const txt=data.content?.find(b=>b.type==="text")?.text||"[No response]";
      setMsgs(prev=>[...prev,{id:Date.now(),role:"assistant",content:txt,ts:Date.now()}]);
    }catch(e){
      setMsgs(prev=>[...prev,{id:Date.now(),role:"assistant",content:`[MESH ERROR] ${e.message}`,ts:Date.now()}]);
    }finally{
      setThinking(false);
    }
  },[input,atts,messages,node,sec,setMsgs]);

  const handleKey=useCallback(e=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}
  },[send]);

  const handleFiles=useCallback(files=>{
    Array.from(files).forEach(f=>{
      if(f.type.startsWith("image/")){
        const r=new FileReader();
        r.onload=ev=>{
          const b64=ev.target.result.split(",")[1];
          setAtts(p=>[...p,{id:Math.random(),type:"image",name:f.name,mediaType:f.type,data:b64,preview:ev.target.result}]);
        };
        r.readAsDataURL(f);
      }else{
        setAtts(p=>[...p,{id:Math.random(),type:"file",name:f.name,size:f.size,file:f}]);
      }
    });
  },[]);

  const download=useCallback(()=>{
    const txt=messages.map(m=>`[${m.role.toUpperCase()}] ${new Date(m.ts).toISOString()}\n${m.content}`).join("\n\n---\n\n");
    const blob=new Blob([`# ${node.label} — Chat Export\n\n${txt}`],{type:"text/markdown"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=`${node.id}.md`;a.click();
    URL.revokeObjectURL(url);
  },[messages,node]);

  if(!node)return null;

  return(
    <div className={`panel${drag?" drag-over":""}`}
      onDragOver={e=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}>
      {/* PANEL HEADER */}
      <div className="ph">
        <div style={{width:8,height:8,borderRadius:"50%",background:sm.dot,boxShadow:`0 0 8px ${sm.dot}`,flexShrink:0}}/>
        <div>
          <div className="ph-name" style={{color:sec.color}}>{node.label}</div>
          <div className="ph-id">{node.id} · {sec.label}</div>
        </div>
        <div className="ph-badge" style={{background:sm.bg,color:sm.dot}}>{sm.label}</div>
        <div className="ph-meta">
          <div className="ph-mi">LATENCY<span>{node.latency}ms</span></div>
          <div className="ph-mi">TOKENS<span>{fmt(node.tokens)}</span></div>
          <div className="ph-mi">NODE<span>#{node.globalIdx}</span></div>
        </div>
        <button className="icon-btn" title="Download chat" onClick={download}>⬇</button>
        <button className="icon-btn" title="Close" style={{fontSize:15}} onClick={onClose}>✕</button>
      </div>

      {/* MESSAGES */}
      <div className="chat" ref={chatRef}>
        {messages.length===0&&(
          <div style={{textAlign:"center",color:"#0a1220",fontSize:10,marginTop:40,letterSpacing:2}}>
            NODE READY · AWAITING INPUT
          </div>
        )}
        {messages.map(msg=>(
          <div key={msg.id} className={`msg ${msg.role}`}>
            <div className="msg-meta">
              <span>{msg.role==="user"?"YOU":node.label}</span>
              <span>{new Date(msg.ts).toLocaleTimeString()}</span>
            </div>
            {(msg.atts||[]).map(a=>
              a.type==="image"
                ?<img key={a.id} src={a.preview} className="msg-img" alt={a.name}/>
                :<div key={a.id} className="msg-file">📄 {a.name}</div>
            )}
            {msg.content&&<div className="bubble">{msg.content}</div>}
          </div>
        ))}
        {thinking&&<div className="typing"><div className="td"/><div className="td"/><div className="td"/></div>}
      </div>

      {/* INPUT */}
      <div className="ia">
        {atts.length>0&&(
          <div className="att-prev">
            {atts.map(a=>(
              <div key={a.id} className="att-chip">
                {a.type==="image"?<img src={a.preview} alt=""/>:"📄"}
                <span>{a.name.length>14?a.name.slice(0,12)+"…":a.name}</span>
                <button className="att-rm" onClick={()=>setAtts(p=>p.filter(x=>x.id!==a.id))}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="ir">
          <div className="ia-actions">
            <button className="ia-btn" title="Attach file" onClick={()=>fileRef.current?.click()}>📎</button>
            <button className="ia-btn" title="Attach image" onClick={()=>fileRef.current?.click()}>🖼</button>
          </div>
          <input type="file" ref={fileRef} style={{display:"none"}} multiple
            accept="image/*,application/pdf,.txt,.md,.json,.csv,.docx"
            onChange={e=>handleFiles(e.target.files)}/>
          <textarea className="ia-txt" placeholder={`Message ${node.label}…`}
            value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}/>
          <button className="send" onClick={send} disabled={thinking||(!input.trim()&&atts.length===0)}>
            SEND ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AUTOMATION FEED
// ══════════════════════════════════════════════════════════════
function AutoFeed(){
  const [events,setEvents]=useState(()=>{
    const rng=seededRng(777);
    return Array.from({length:30},()=>seededFeedEvt(rng));
  });
  useEffect(()=>{
    const rng=seededRng(Date.now()%99999);
    const id=setInterval(()=>{
      setEvents(p=>[seededFeedEvt(rng),...p.slice(0,120)]);
    },600+Math.random()*900);
    return()=>clearInterval(id);
  },[]);
  return(
    <div className="feed">
      <div className="fhdr"><div className="f-live"/>AUTOMATION FEED</div>
      <div className="fitems">
        {events.map((e,i)=>(
          <div key={i} className="fi">
            <div className="fi-hdr">
              <span className="fi-id" style={{color:e.sec.color}}>{e.sec.id}</span>
              <span className="fi-t">{ago(e.ts)}</span>
            </div>
            <div className="fi-txt">{e.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════
export default function App(){
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [feedOpen,setFeedOpen]=useState(true);
  const [tabs,setTabs]=useState([]);            // [{nodeId}]
  const [activeTab,setActiveTab]=useState(null);
  const [sbFilter,setSbFilter]=useState("");
  const [tbSearch,setTbSearch]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [msgStore,setMsgStore]=useState({});    // {nodeId: [{...}]}

  // Inject CSS once
  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=CSS;
    document.head.appendChild(el);
    return()=>document.head.removeChild(el);
  },[]);

  const openSet=useMemo(()=>new Set(tabs.map(t=>t.nodeId)),[tabs]);

  const filteredNodes=useMemo(()=>{
    const q=(sbFilter||tbSearch).toLowerCase();
    return ALL_NODES.filter(n=>{
      if(statusFilter!=="all"&&n.status!==statusFilter)return false;
      if(q&&!n.label.toLowerCase().includes(q)&&!n.id.toLowerCase().includes(q))return false;
      return true;
    });
  },[sbFilter,tbSearch,statusFilter]);

  const nodesBySection=useMemo(()=>{
    const m={};
    SECTION_DEFS.forEach(s=>{m[s.id]=[];});
    filteredNodes.forEach(n=>{if(m[n.sectionId])m[n.sectionId].push(n);});
    return m;
  },[filteredNodes]);

  const metrics=useMemo(()=>{
    const m={active:0,processing:0,idle:0,error:0,offline:0};
    ALL_NODES.forEach(n=>m[n.status]++);
    return m;
  },[]);

  const openNode=useCallback(nd=>{
    setTabs(p=>p.find(t=>t.nodeId===nd.id)?p:[...p,{nodeId:nd.id}]);
    setActiveTab(nd.id);
    // Initialize messages if first time
    setMsgStore(p=>{
      if(p[nd.id])return p;
      return{...p,[nd.id]:[{id:Date.now(),role:"assistant",content:`${nd.label} online. Governed under DCGP constitutional constraints. Ready to process.`,ts:Date.now()}]};
    });
  },[]);

  const closeTab=useCallback((nodeId,e)=>{
    e?.stopPropagation();
    setTabs(p=>{
      const next=p.filter(t=>t.nodeId!==nodeId);
      if(activeTab===nodeId){
        setActiveTab(next.length>0?next[next.length-1].nodeId:null);
      }
      return next;
    });
  },[activeTab]);

  const handleMessages=useCallback((nodeId,updater)=>{
    setMsgStore(p=>({...p,[nodeId]:typeof updater==="function"?updater(p[nodeId]||[]):updater}));
  },[]);

  const activeNode=ALL_NODES.find(n=>n.id===activeTab);

  return(
    <div className="app">
      {/* ── TOP BAR ── */}
      <div className="topbar">
        <button className="hbg" onClick={()=>setSidebarOpen(o=>!o)}>
          <span/><span/><span/>
        </button>
        <div className="logo-block">
          <div className="logo-main">DCGP·AI MESH</div>
          <div className="logo-sub">DISTRIBUTED CONSTITUTIONAL GOVERNANCE PROTOCOL</div>
        </div>
        <div className="tb-search">
          <i className="tb-search-ico">⌕</i>
          <input placeholder="Search 4,000 nodes across 10 clusters…"
            value={tbSearch}
            onChange={e=>{setTbSearch(e.target.value);setSbFilter(e.target.value);if(!sidebarOpen)setSidebarOpen(true);}}/>
        </div>
        <div className="tb-metrics">
          {[
            {l:"ACTIVE",v:metrics.active,c:"#00e676"},
            {l:"PROC",v:metrics.processing,c:"#ffab00"},
            {l:"IDLE",v:metrics.idle,c:"#37474f"},
            {l:"ERR",v:metrics.error,c:"#ff1744"},
          ].map(m=>(
            <div key={m.l} className="mc">
              <div className="dot" style={{background:m.c}}/>
              <span>{m.l}</span>
              <span className="v" style={{color:m.c}}>{m.v}</span>
            </div>
          ))}
        </div>
        <button className="tb-btn" onClick={()=>setFeedOpen(o=>!o)}>
          {feedOpen?"FEED ▶":"◀ FEED"}
        </button>
      </div>

      {/* ── MAIN ── */}
      <div className="main">
        {/* SIDEBAR */}
        <div className={`sidebar${sidebarOpen?"":" off"}`}>
          <div className="sb-search">
            <input placeholder="Filter nodes…" value={sbFilter}
              onChange={e=>{setSbFilter(e.target.value);setTbSearch(e.target.value);}}/>
            <div className="sb-filter-row">
              {["all","active","processing","idle","error","offline"].map(s=>(
                <button key={s} className={`sb-chip${statusFilter===s?" on":""}`}
                  onClick={()=>setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="sec-list">
            {SECTION_DEFS.map((sec,i)=>(
              <SectionItem key={sec.id} sec={sec}
                nodes={nodesBySection[sec.id]||[]}
                openSet={openSet}
                onOpen={openNode}
                defaultOpen={i===0}/>
            ))}
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="ws">
          {/* TAB BAR */}
          <div className="tab-bar">
            {tabs.map(tab=>{
              const nd=ALL_NODES.find(n=>n.id===tab.nodeId);
              if(!nd)return null;
              const s=SECTION_DEFS.find(x=>x.id===nd.sectionId);
              const sm2=SM[nd.status];
              return(
                <div key={tab.nodeId} className={`tab${activeTab===tab.nodeId?" on":""}`}
                  onClick={()=>setActiveTab(tab.nodeId)}>
                  <div className="tab-dot" style={{background:sm2.dot}}/>
                  <span className="tab-nm" style={activeTab===tab.nodeId?{color:s?.color}:{}}>{nd.label}</span>
                  <button className="tab-x" onClick={e=>closeTab(tab.nodeId,e)}>×</button>
                </div>
              );
            })}
            <button className="tab-add" title="Open multiple nodes from sidebar">+</button>
          </div>

          {/* PANELS */}
          <div className="panels">
            {tabs.length===0?(
              <div className="empty">
                <div className="empty-logo">DCGP.AI</div>
                <div className="empty-sub">MESH CONTROL CENTER</div>
                <div className="empty-hint">SELECT A NODE FROM THE LEFT PANEL TO BEGIN · 4,000 NODES ONLINE</div>
              </div>
            ):(
              tabs.map(tab=>(
                <div key={tab.nodeId} style={{display:activeTab===tab.nodeId?"flex":"none",flex:1,flexDirection:"column",overflow:"hidden"}}>
                  <NodePanel
                    nodeId={tab.nodeId}
                    allMessages={msgStore}
                    onMessages={handleMessages}
                    onClose={()=>closeTab(tab.nodeId)}/>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FEED */}
        {feedOpen&&<AutoFeed/>}
      </div>

      {/* ── STATUS BAR ── */}
      <div className="sbar">
        <div className="si">DCGP·AI MESH CONTROL v1.0</div>
        <div className="si">NODES <span className="v">4,000</span></div>
        <div className="si">CLUSTERS <span className="v">10</span></div>
        <div className="si">OPEN TABS <span className="v">{tabs.length}</span></div>
        <div className="si">NAMED <span className="v">1,000</span></div>
        <div className="si">ACTIVE <span className="v" style={{color:"#00e676"}}>{metrics.active}</span></div>
        <div className="si">PROC <span className="v" style={{color:"#ffab00"}}>{metrics.processing}</span></div>
        <div className="si">ERR <span className="v" style={{color:"#ff1744"}}>{metrics.error}</span></div>
        <div className="si" style={{marginLeft:"auto"}}>
          CONSTITUTIONAL GOVERNANCE <span className="v" style={{color:"#00e676"}}>● ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
