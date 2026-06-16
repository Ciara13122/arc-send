"use client";
/* Arc Send — standalone P2P pay-by-@username dApp. Self-contained: own connect/toArc/inline CSS.
   ABI preserved: register/resolve/sendByName/sendTo/addrToName/totalUsers/txCount/getRecv/getSent/getPayment. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import { parseEther, formatEther, isAddress } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52", ZERO = "0x0000000000000000000000000000000000000000";
const ABI = [
  { name: "register", type: "function", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }], outputs: [] },
  { name: "resolve", type: "function", stateMutability: "view", inputs: [{ name: "name", type: "string" }], outputs: [{ type: "address" }] },
  { name: "sendByName", type: "function", stateMutability: "payable", inputs: [{ name: "name", type: "string" }, { name: "note", type: "string" }], outputs: [] },
  { name: "sendTo", type: "function", stateMutability: "payable", inputs: [{ name: "to", type: "address" }, { name: "note", type: "string" }], outputs: [] },
  { name: "addrToName", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "string" }] },
  { name: "totalUsers", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "txCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getRecv", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "getSent", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "getPayment", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }, { name: "note", type: "string" }, { name: "at", type: "uint256" }] }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.as{--bg:#0b0e14;--card:#11151f;--card2:#161b27;--bd:#1b2230;--bd2:#2a3344;--mut:#7b8aa3;--txt:#e8edf5;--acc:#6366f1;--acc2:#818cf8;--up:#22c55e;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Segoe UI',system-ui,sans-serif}
.as *{box-sizing:border-box}.as a{color:var(--acc2);text-decoration:none}
.as header{display:flex;align-items:center;gap:10px;padding:14px 22px;border-bottom:1px solid var(--bd)}
.as .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.as .mark{width:32px;height:32px;border-radius:9px;background:var(--acc);display:grid;place-items:center;font-size:16px}
.as .chip{font-size:11px;color:var(--mut);border:1px solid var(--bd2);border-radius:99px;padding:3px 9px}
.as .btn{border:0;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;padding:9px 16px;transition:.15s}.as .btn:disabled{opacity:.5;cursor:not-allowed}
.as .pri{background:var(--acc);color:#fff}.as .pri:hover:not(:disabled){background:var(--acc2)}.as .red{background:#dc2626;color:#fff}
.as .wrap{max-width:880px;margin:0 auto;padding:22px 22px 60px}
.as .tabs{display:inline-flex;gap:4px;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:4px;margin-bottom:18px}
.as .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:13px;padding:8px 14px;border-radius:9px;cursor:pointer}.as .tab.on{background:var(--acc);color:#fff}
.as .grid{display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start}
.as .lab{font-size:13px;color:var(--mut);margin-bottom:8px}
.as .item{display:flex;align-items:center;gap:12px;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:11px 14px;margin-bottom:8px}
.as .ic{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700}
.as .card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px}
.as .card h3{margin:0 0 14px;font-size:15px;font-weight:700}
.as label{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 5px}
.as input{width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:10px;padding:11px 13px;font:inherit;font-size:14px;color:var(--txt);outline:none}.as input:focus{border-color:var(--acc)}
.as .stat{flex:1;background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px;text-align:center}
.as .menu{position:absolute;right:0;top:118%;background:var(--card2);border:1px solid var(--bd2);border-radius:11px;padding:6px;min-width:190px;z-index:30;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.as .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13.5px;padding:9px 12px;border-radius:8px;cursor:pointer}.as .menu button:hover{background:rgba(255,255,255,.05)}
@media(max-width:780px){.as .grid{grid-template-columns:1fr}}
`;
function Row({ id, me }: { id: bigint; me?: string }) {
  const { data: p } = useReadContract({ address: C, abi: ABI, functionName: "getPayment", args: [id] });
  if (!p) return null; const it = p as any; const inc = me && it.to.toLowerCase() === me.toLowerCase();
  return (
    <div className="item">
      <div className="ic" style={{ background: inc ? "rgba(34,197,94,.15)" : "rgba(99,102,241,.15)", color: inc ? "#22c55e" : "#818cf8" }}>{inc ? "↓" : "↑"}</div>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{inc ? `From ${cut(it.from)}` : `To ${cut(it.to)}`}</div>{it.note && <div style={{ fontSize: 12, color: "var(--mut)" }}>{it.note}</div>}</div>
      <div style={{ fontWeight: 700, color: inc ? "#22c55e" : "#cfd6e4" }}>{inc ? "+" : "−"}${usd(it.amount)}</div>
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"pay" | "activity" | "you" | "xfer">("pay");
  const [snd, setSnd] = useState({ to: "", amount: "" });
  const sendx = useSendTransaction(); const srcpt = useWaitForTransactionReceipt({ hash: sendx.data, query: { enabled: !!sendx.data } });
  const sbusy = sendx.isPending || srcpt.isLoading;
  const [to, setTo] = useState(""); const [amount, setAmount] = useState(""); const [note, setNote] = useState(""); const [name, setName] = useState("");
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const busy = tx.isPending || rcpt.isLoading;
  const myName = useReadContract({ address: C, abi: ABI, functionName: "addrToName", args: address ? [address] : undefined, query: { enabled: !!address } });
  const users = useReadContract({ address: C, abi: ABI, functionName: "totalUsers" });
  const txc = useReadContract({ address: C, abi: ABI, functionName: "txCount" });
  const recv = useReadContract({ address: C, abi: ABI, functionName: "getRecv", args: address ? [address] : undefined, query: { enabled: !!address } });
  const sent = useReadContract({ address: C, abi: ABI, functionName: "getSent", args: address ? [address] : undefined, query: { enabled: !!address } });
  const isAddr = isAddress(to.trim()); const cleanName = to.trim().replace(/^@/, "");
  const resolved = useReadContract({ address: C, abi: ABI, functionName: "resolve", args: [cleanName], query: { enabled: !isAddr && cleanName.length >= 3 } });
  useEffect(() => { if (rcpt.isSuccess) { myName.refetch(); recv.refetch(); sent.refetch(); tx.reset(); setTo(""); setAmount(""); setNote(""); setName(""); } }, [rcpt.isSuccess]); // eslint-disable-line
  useEffect(() => { if (srcpt.isSuccess) { sendx.reset(); setSnd({ to: "", amount: "" }); } }, [srcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN;
  const okRecip = isAddr || (resolved.data && resolved.data !== ZERO);
  const ids = [...((recv.data as readonly bigint[]) || []), ...((sent.data as readonly bigint[]) || [])].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => Number(b - a));
  function doSend() { if (isAddr) tx.writeContract({ address: C, abi: ABI, functionName: "sendTo", args: [to.trim() as `0x${string}`, note], value: parseEther(amount || "0") }); else tx.writeContract({ address: C, abi: ABI, functionName: "sendByName", args: [cleanName, note], value: parseEther(amount || "0") }); }
  return (
    <div className="as">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">💸</span>Arc Send</div>
        <span className="chip">Pay anyone · USDC</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button className={"btn " + (wrong ? "red" : "")} onClick={toArc} style={wrong ? {} : { background: "var(--card2)", color: "var(--txt)", border: "1px solid var(--bd2)" }}>{wrong ? "Switch to Arc" : "⚡ Arc network"}</button>
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#f87171" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        <div className="tabs">
          {([["pay", "Pay"], ["activity", "Activity"], ["xfer", "Transfer"], ["you", "Profile"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}
        </div>
        {tab === "pay" && <div className="grid">
          <div>
            <div className="lab">Recent activity</div>
            {ids.length === 0 ? <div style={{ color: "var(--mut)", fontSize: 13, padding: "20px 0" }}>No activity yet</div> : ids.slice(0, 6).map(id => <Row key={id.toString()} id={id} me={address} />)}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <div className="stat"><div style={{ fontSize: 20, fontWeight: 800 }}>{users.data?.toString() ?? "0"}</div><div style={{ fontSize: 11, color: "var(--mut)" }}>users</div></div>
              <div className="stat"><div style={{ fontSize: 20, fontWeight: 800 }}>{txc.data?.toString() ?? "0"}</div><div style={{ fontSize: 11, color: "var(--mut)" }}>payments</div></div>
            </div>
          </div>
          <div className="card">
            <h3>Pay someone</h3>
            <label>To</label><input value={to} onChange={e => setTo(e.target.value)} placeholder="@username or 0x…" />
            {to.trim().length >= 3 && <div style={{ fontSize: 12, marginTop: 5, color: okRecip ? "#22c55e" : "var(--mut)" }}>{isAddr ? "✓ Valid address" : okRecip ? `✓ Found @${cleanName} · ${cut(resolved.data as string)}` : `No user @${cleanName} yet`}</div>}
            <label>Amount</label><input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0.00" style={{ fontSize: 20, fontWeight: 800 }} />
            <label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="What's it for?" />
            <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !okRecip || !(Number(amount) > 0)} onClick={doSend}>{busy ? "Sending…" : amount ? `Send $${usd(parseEther(amount || "0"))} 💸` : "Send 💸"}</button>
          </div>
        </div>}
        {tab === "activity" && <div>{ids.length === 0 ? <div style={{ color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No activity yet</div> : ids.map(id => <Row key={id.toString()} id={id} me={address} />)}</div>}
        {tab === "xfer" && <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          <h3>Transfer USDC</h3>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}>Send USDC straight to any address on Arc.</div>
          <label>To</label><input value={snd.to} onChange={e => setSnd(s => ({ ...s, to: e.target.value }))} placeholder="0x…" style={{ fontFamily: "ui-monospace" }} />
          <label>Amount</label><input value={snd.amount} onChange={e => setSnd(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 20, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || sbusy || !isAddress(snd.to) || !(Number(snd.amount) > 0)} onClick={() => sendx.sendTransaction({ to: snd.to as `0x${string}`, value: parseEther(snd.amount || "0") })}>{sbusy ? "Sending…" : "Transfer 💸"}</button>
          {srcpt.isSuccess && <div style={{ fontSize: 12, color: "#22c55e", textAlign: "center", marginTop: 8 }}>✓ Sent</div>}
        </div>}
        {tab === "you" && <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
          {myName.data ? <div style={{ textAlign: "center" }}><div style={{ fontSize: 44 }}>🪪</div><div style={{ fontSize: 24, fontWeight: 800 }}>@{myName.data as string}</div><div style={{ fontSize: 12, color: "var(--mut)" }}>{cut(address)}</div><div style={{ fontSize: 13, color: "var(--mut)", marginTop: 8 }}>People can pay you by typing <b style={{ color: "var(--txt)" }}>@{myName.data as string}</b>.</div></div>
            : <><div style={{ textAlign: "center", marginBottom: 6 }}><div style={{ fontSize: 40 }}>🪪</div><div style={{ fontWeight: 700 }}>Claim your @username</div><div style={{ fontSize: 12, color: "var(--mut)" }}>So friends pay you without copying addresses.</div></div>
              <label>Username</label><input value={name} onChange={e => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="yourname" />
              <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || name.length < 3} onClick={() => tx.writeContract({ address: C, abi: ABI, functionName: "register", args: [name] })}>{busy ? "…" : "Claim @username"}</button></>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div className="stat"><div style={{ fontSize: 18, fontWeight: 800 }}>{users.data?.toString() ?? "0"}</div><div style={{ fontSize: 11, color: "var(--mut)" }}>users</div></div>
            <div className="stat"><div style={{ fontSize: 18, fontWeight: 800 }}>{txc.data?.toString() ?? "0"}</div><div style={{ fontSize: 11, color: "var(--mut)" }}>payments</div></div>
          </div>
        </div>}
        <div style={{ textAlign: "center", color: "#56617a", fontSize: 12, marginTop: 24 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
