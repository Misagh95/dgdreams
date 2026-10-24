import { NextRequest, NextResponse } from "next/server";
import { getNetworkConfig } from "@/config/chains";
import { badgeImage } from "@/lib/badge";

/**
 * Off-chain metadata for the Grand Tour badges (ChainBadge).
 *
 * The badge contract is deployed on every network, so its tokenURI has to
 * describe *this* chain — that is why the contract appends `?chain=<id>` and
 * this route looks the chain up in the app's own network list. The image is
 * the network's Grand Tour artwork from /public/output-premium, so the badge
 * and the gallery card agree.
 */

export async function GET(request: NextRequest) {
  const chain = Number(request.nextUrl.searchParams.get("chain"));
  const idParam = request.nextUrl.searchParams.get("id") ?? "";

  if (!Number.isInteger(chain) || chain <= 0 || idParam === "") {
    return NextResponse.json(
      { error: "Missing or invalid parameters. Expect ?chain=<chainId>&id=<tokenId>" },
      { status: 400 }
    );
  }

  const network = getNetworkConfig(chain);
  if (!network) {
    return NextResponse.json(
      { error: `Unknown chain ${chain} — not a DGDreams network.` },
      { status: 404 }
    );
  }

  const id = Number(idParam);
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    request.nextUrl.origin;

  const metadata = {
    name: `DGDreams ${network.shortName} Badge #${Number.isFinite(id) ? id : idParam}`,
    description:
      `Soulbound proof that this wallet set foot on ${network.name} through DGDreams. ` +
      "Non-transferable, unlimited mints, minted for gas only.",
    image: `${origin}${badgeImage(network)}`,
    external_url: "https://dgdreams.space",
    attributes: [
      { trait_type: "Network", value: network.name },
      { trait_type: "Network Type", value: network.isTestnet ? "Testnet" : "Mainnet" },
      { trait_type: "Chain ID", value: network.id },
      { trait_type: "Collection", value: "DGDreams Grand Tour" },
      { trait_type: "Token ID", value: Number.isFinite(id) ? id : idParam },
    ],
  };

  return NextResponse.json(metadata, {
    headers: {
      // Marketplaces and wallets fetch this server-side; CORS keeps browser
      // previews (validators, explorers) working too.
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
