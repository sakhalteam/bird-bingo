import BirdBingo from "./BirdBingo";

function HomeBtn() {
  return (
    <a href="https://sakhalteam.github.io/" className="home-btn" title="Back to island">
      <svg width="20" height="12" viewBox="0 0 32 18" fill="currentColor" aria-hidden="true">
        <path d="M 4,10 C 5,4 9,2 14,3 C 18,4 20,2 24,4 C 28,6 29,11 26,15 C 22,18 12,18 6,15 C 2,13 2,11 4,10 Z" />
      </svg>
      sakhalteam
    </a>
  );
}

function ScrollToTop() {
  return (
    <button
      className="scroll-top-btn"
      onClick={() => {
        // Content scrolls inside <body> (html/body are height:100%), so
        // window.scrollTo alone does nothing. The other call is a no-op.
        const opts: ScrollToOptions = { top: 0, behavior: 'smooth' };
        window.scrollTo(opts);
        document.body.scrollTo(opts);
      }}
      aria-label="Back to top"
    >
      &uarr; Top
    </button>
  );
}

export default function App() {
  return (
    <>
      <HomeBtn />
      <div className="gradient-bg" />
      <div className="wrap">
        <BirdBingo />
      </div>
      <ScrollToTop />
    </>
  );
}
