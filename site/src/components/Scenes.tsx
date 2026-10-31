import { Icon, type IconName } from "./Icon";

const av = (n: number) => `/avatars/${n}.png`;

/** The Teams card from the app's welcome screen, with fictional teams. */
export function TeamsScene() {
  const rows: { icon: IconName; name: string; meta: string; faces: number[]; need?: boolean }[] = [
    { icon: "mega", name: "Communications", meta: "4 of 6 done", faces: [1, 2] },
    { icon: "pin", name: "Venue", meta: "2 of 3 done", faces: [3] },
    { icon: "palette", name: "Design", meta: "1 of 4 done", faces: [4, 5, 6] },
    { icon: "mic", name: "Speakers", meta: "3 tasks waiting", faces: [], need: true },
    { icon: "users", name: "Volunteers", meta: "12 people", faces: [7, 1] },
  ];
  return <div className="stage" aria-hidden="true">
    <div className="shot">
      <div className="shot-bar"><span className="mark"><img src="/emblem.png" alt="" width={20} height={20} /></span>Lahug Uplands Fun Run</div>
      {rows.map((r) => <div className="shot-row" key={r.name}>
        <span className="tile"><Icon name={r.icon} size={17} /></span>
        <span className="lines"><b>{r.name}</b><i>{r.meta}</i></span>
        {r.need ? <span className="tag">Needs a lead</span> : <span className="faces">{r.faces.map((f) => <img key={f} src={av(f)} alt="" />)}</span>}
      </div>)}
    </div>
  </div>;
}

/** A finished task, signed by the group. */
export function RecordScene() {
  const steps = [{ t: "Book the covered court", done: true, f: 4 }, { t: "Print 200 race bibs", done: true, f: 5 }, { t: "Water station at km 3", done: false, f: 6 }];
  return <div className="stage" aria-hidden="true">
    <div className="shot" style={{ transform: "rotate(.9deg)" }}>
      <div className="shot-bar"><span className="mark"><Icon name="lock" size={16} /></span>Recorded and signed by your group</div>
      {steps.map((s) => <div className="shot-row" key={s.t}>
        <span className="tile" style={s.done ? { background: "var(--primary)", color: "#fff" } : { background: "#fff", border: "1.5px solid var(--s200)" }}>{s.done ? <Icon name="check" size={15} /> : null}</span>
        <span className="lines"><b style={s.done ? { color: "var(--s500)" } : undefined}>{s.t}</b><i>{s.done ? "Done · signed" : "Open · anyone can help"}</i></span>
        <span className="faces"><img src={av(s.f)} alt="" /></span>
      </div>)}
    </div>
  </div>;
}

/** Groups gathered around one project, for the Ecosystem. */
export function NetworkScene() {
  const faces = [{ n: 1, l: "8%", t: "12%" }, { n: 2, r: "8%", t: "16%" }, { n: 3, l: "4%", t: "48%" }, { n: 4, r: "4%", t: "52%" }, { n: 5, l: "18%", t: "80%" }, { n: 6, r: "18%", t: "82%" }];
  return <div className="stage" aria-hidden="true">
    {faces.map((f) => <img key={f.n} className="float-face" src={av(f.n)} alt="" style={{ left: f.l, right: f.r, top: f.t }} />)}
    <div className="shot" style={{ width: 230, transform: "rotate(-1.2deg)" }}>
      <div className="shot-bar"><span className="mark"><Icon name="pin" size={16} /></span>Near Barangay Lahug</div>
      {[["book", "Reading camp", "3 groups"], ["heart", "Coastal cleanup", "5 groups"], ["users", "Youth fun run", "2 groups"]].map(([i, t, m]) => <div className="shot-row" key={t}>
        <span className="tile"><Icon name={i as IconName} size={16} /></span><span className="lines"><b>{t}</b><i>{m}</i></span></div>)}
    </div>
  </div>;
}

/** One big job broken into small steps, each with someone on it. Fictional. */
export function BreakdownScene() {
  const steps = [
    { t: "Ask the barangay for tables", who: "Done", f: 2, done: true },
    { t: "Pick up 300 bottles of water", who: "Josh is on it", f: 3 },
    { t: "Hand out water at km 3", who: "2 more hands", f: 0 },
    { t: "Count what's left", who: "Good first step", f: 0 },
  ];
  return <div className="stage" aria-hidden="true">
    <div className="shot" style={{ transform: "rotate(-.8deg)" }}>
      <div className="shot-bar"><span className="mark"><Icon name="flag" size={16} /></span>Water station at km 3</div>
      {steps.map((s) => <div className="shot-row" key={s.t}>
        <span className="tile" style={s.done ? { background: "var(--primary)", color: "#fff" } : { background: "#fff", border: "1.5px solid var(--s200)" }}>{s.done ? <Icon name="check" size={15} /> : null}</span>
        <span className="lines"><b style={s.done ? { color: "var(--s500)" } : undefined}>{s.t}</b><i>{s.who}</i></span>
        {s.f ? <span className="faces"><img src={av(s.f)} alt="" /></span> : <span className="faces"><span className="open-dot">+</span></span>}
      </div>)}
    </div>
  </div>;
}

/** Bayani with a group chat message: the message in, a draft out, and a person who says yes. Sample message. */
export function BayaniScene() {
  return <div className="stage bayani-stage" aria-hidden="true">
    <div className="bubble"><img src={av(5)} alt="" /><div><b>Marco</b><p>Ate, di ako makakapunta Saturday pero may 2 sacks of rice ako para sa feeding. Dadalhin ko na lang sa parish hall Friday night.</p></div></div>
    <div className="bayani-arrow"><span><Icon name="spark" size={16} /></span>Bayani drafts, on the phone</div>
    <div className="shot bayani-draft">
      <div className="shot-bar"><span className="mark"><Icon name="spark" size={16} /></span>Suggested by Bayani · check it</div>
      <div className="shot-row"><span className="tile" style={{ background: "#FFEBD9", color: "#B4500F" }}><Icon name="sack" size={15} /></span><span className="lines"><b>Offer: 2 sacks of rice</b><i>From Marco, for Saturday feeding</i></span></div>
      <div className="shot-row"><span className="tile" style={{ background: "#FFEBD9", color: "#B4500F" }}><Icon name="handshake" size={15} /></span><span className="lines"><b>Receive the rice at the parish hall</b><i>Friday, 6–9 PM · open</i></span></div>
      <div className="shot-row"><span className="tile" style={{ background: "#FFEBD9", color: "#B4500F" }}><Icon name="repeat" size={15} /></span><span className="lines"><b>Marco's Saturday slot opens up</b><i>Someone else can say “I'm in”</i></span></div>
      <div className="draft-btns"><span className="yes">Looks right</span><span className="edit">Change it</span></div>
    </div>
  </div>;
}

/** Bayani inside a task: suggested smaller steps, and who on the roster to ask, with the reason. Fictional. */
export function BayaniPlanScene() {
  const steps = [
    { t: "Shortlist 3 venues", who: "Ask Ana · booked the court last year", f: 4 },
    { t: "Visit the top two", who: "Ask Josh · free on Saturdays", f: 3 },
    { t: "Get written quotes", who: "Good first step · open to the team", f: 0 },
    { t: "Pay the deposit", who: "Finance team · needs a second person to confirm", f: 6 },
  ];
  return <div className="stage bayani-stage" aria-hidden="true">
    <div className="shot bayani-draft">
      <div className="shot-bar"><span className="mark"><Icon name="flag" size={16} /></span>Secure the venue · Fun run 2027</div>
      <div className="bayani-suggest"><span><Icon name="spark" size={14} /></span>Bayani suggests 4 smaller steps</div>
      {steps.map((s) => <div className="shot-row" key={s.t}>
        <span className="tile" style={{ background: "#fff", border: "1.5px dashed #F5B98C" }} />
        <span className="lines"><b>{s.t}</b><i>{s.who}</i></span>
        {s.f ? <span className="faces"><img src={av(s.f)} alt="" /></span> : <span className="faces"><span className="open-dot">+</span></span>}
      </div>)}
      <div className="draft-btns"><span className="yes">Use these steps</span><span className="edit">Change</span></div>
    </div>
  </div>;
}
