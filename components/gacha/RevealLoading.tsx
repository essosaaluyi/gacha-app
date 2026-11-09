import Image from "next/image";

export default function RevealLoading() {
  return <div className="destiny-loading" role="status" aria-label="Loading">
    <div className="destiny-loading-tiles" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <span key={index}>DESTINY LEGEND</span>)}</div>
    <div className="destiny-loading-center"><Image src="/images/team-c-title.webp" alt="Destiny Wars" width={360} height={200} unoptimized /><p>LOADING<span aria-hidden="true">…</span></p></div>
  </div>;
}
