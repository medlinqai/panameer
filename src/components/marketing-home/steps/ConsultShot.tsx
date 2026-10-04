
const SLOTS = [
  { day: "Tue", date: "19", time: "10:30 am", taken: false },
  { day: "Wed", date: "20", time: "2:00 pm", taken: true },
  { day: "Thu", date: "21", time: "9:00 am", taken: false },
];

export function ConsultShot() {
  return (
    <div className="cos">
      <div className="cos-who">
        <span className="cos-av" aria-hidden>
          SW
        </span>
        <span className="cos-wt">
          <b>Scott Walls</b>
          <span>Project Coordinator</span>
        </span>
        {}
        <span className="cos-badge">45 minutes</span>
      </div>

      <div className="cos-has">
        <span className="cos-check" aria-hidden>
          &#10003;
        </span>
        <span>
          Has already read your scorecard &mdash; every domain, every score, and the
          ranked opportunities.
        </span>
      </div>

      <div className="cos-slots">
        {SLOTS.map((s) => (
          <span
            key={s.date}
            className={"cos-slot" + (s.taken ? " is-taken" : "")}
          >
            <span className="cos-day">{s.day}</span>
            <span className="cos-date">{s.date}</span>
            <span className="cos-time">{s.taken ? "booked" : s.time}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
