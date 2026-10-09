"use client";
import { useEffect, useState } from "react";
import ProductGallery from "./ProductGallery";
import AddToCartPanel from "./AddToCartPanel";
import { comboKey } from "@/lib/variants";

// Shares the selected colour between the purchase panel and the gallery. The
// colour is picked from the swatches under the gallery (clicking a photo picks
// its colour too); the panel reacts to that choice for price, stock and buy.
export default function ProductView({ product }) {
  const hasColours = product.colours?.length > 0;
  const [colour, setColour] = useState(hasColours ? "" : "-");

  // Count every visit to this product — repeat visits and refreshes by the same
  // person all add to the total. Fired from the browser (not during server
  // render) so prefetches / bots / metadata fetches don't inflate it.
  useEffect(() => {
    if (!product?.id) return;
    fetch(`/api/products/${product.id}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [product?.id]);

  // Colours with every size combination sold out — shown crossed-out.
  const variantStock = product.variantStock || {};
  const sizePool = product.sizes?.length ? product.sizes : [""];
  const soldOutColours = (product.colours || []).filter((c) =>
    sizePool.every((s) => variantStock[comboKey(s, c)] === false)
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
      <ProductGallery
        images={product.images}
        imageColours={product.imageColours}
        name={product.name}
        inStock={product.inStock}
        colours={product.colours || []}
        soldOutColours={soldOutColours}
        activeColour={colour}
        onColour={setColour}
      />
      <AddToCartPanel product={product} colour={colour} setColour={setColour} />
    </div>
  );
}
