import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";

export default function NotFound() {
  return <><Header /><main><section className="hero"><div className="wrap"><h1>That page isn't here</h1><p className="lead">It may have moved, or it isn't written yet.</p><div className="btns"><Link className="btn btn-primary" href="/">Go home</Link></div></div></section></main><Footer /></>;
}
