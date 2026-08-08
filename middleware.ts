import { NextResponse, type NextRequest } from "next/server";

// Internal tuning/preview screens. They are not linked from the game UI, but
// without this they are still publicly reachable on a deployed build -- they
// expose unfinished art, timing controls and preset editors. Kept fully
// available in development.
const DEV_ONLY_ROUTES = [
  "/animation-workstation",
  "/attack-fakeout-workstation",
  "/cut-in-workstation",
  "/card-motion-lab",
  "/battle-sim",
  "/effect-test",
  "/faceoff-preview",
];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  const isDevOnly = DEV_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isDevOnly) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/animation-workstation/:path*",
    "/attack-fakeout-workstation/:path*",
    "/cut-in-workstation/:path*",
    "/card-motion-lab/:path*",
    "/battle-sim/:path*",
    "/effect-test/:path*",
    "/faceoff-preview/:path*",
  ],
};
