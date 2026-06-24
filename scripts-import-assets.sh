#!/bin/bash
# Curate + optimize existing AIREA assets into the site's public/assets.
set -u
WB="/Users/mrszanto/Claude Work output/AIREA Studio/Website"
SITE="$WB/AIREA Studio AI System/site/assets"
DST="$WB/aireastudio-site/public/assets"

to_jpg() { # src dst maxdim quality
  local s="$1" d="$2" m="${3:-1200}" q="${4:-82}"
  [ -f "$s" ] || { echo "MISS  $s"; return; }
  sips -s format jpeg -s formatOptions "$q" -Z "$m" "$s" --out "$d" >/dev/null 2>&1 && echo "jpg   $(basename "$d")"
}
to_png() { # src dst [maxdim]
  local s="$1" d="$2" m="${3:-}"
  [ -f "$s" ] || { echo "MISS  $s"; return; }
  if [ -n "$m" ]; then sips -Z "$m" "$s" --out "$d" >/dev/null 2>&1; else cp "$s" "$d"; fi
  echo "png   $(basename "$d")"
}

echo "== brand + robot + platforms =="
to_png "$WB/official-head.png"            "$DST/robot/head.png"
to_png "$WB/logo/airea-studio-logo.png"   "$DST/brand/logo-wordmark.png"
to_png "$SITE/brand/facebook.png"         "$DST/platforms/facebook.png"
to_png "$SITE/brand/instagram.png"        "$DST/platforms/instagram.png"
to_png "$SITE/brand/meta.png"             "$DST/platforms/meta.png"
to_png "$SITE/brand/google.png"           "$DST/platforms/google.png"

echo "== product screen-grabs (mobile, keep native) =="
PSG="$WB/Platform Screen Grabs"
to_png "$PSG/1. Homepage/Homepage_successful Brand DNA.png"                       "$DST/product/home-agent.png"
to_png "$PSG/1. Homepage/Mobile Homepage.png"                                     "$DST/product/home.png"
to_png "$PSG/2. Brand DNA/Brand DNA_Homepage.png"                                 "$DST/product/brand-dna.png"
to_png "$PSG/2. Brand DNA/Train Brand DNA_Add URL.png"                            "$DST/product/brand-dna-url.png"
to_png "$PSG/3. Campaign Creation/Campaign Creation_Camapign Name Brainstorm output.png" "$DST/product/campaign-name.png"
to_png "$PSG/4. Choose Media Type/Paid Media_Meta.png"                            "$DST/product/media-meta.png"
to_png "$PSG/4. Choose Media Type/Organic_Insta.png"                              "$DST/product/media-insta.png"
to_png "$PSG/4. Choose Media Type/Paid Media_google_keywords.png"                 "$DST/product/media-google.png"
to_png "$PSG/5. Upload Images_Creative Direction/Creative Direction Options.png"  "$DST/product/creative-direction.png"
to_png "$PSG/5. Upload Images_Creative Direction/Generate Creative Direction.png" "$DST/product/creative-generate.png"
to_png "$PSG/6. Campaign Review/Campaig Review.png"                               "$DST/product/review.png"
to_png "$PSG/6. Campaign Review/Campaign Review_Edit with AI image.png"           "$DST/product/review-edit-image.png"
to_png "$PSG/6. Campaign Review/Campaign Review_Edit with AI copy.png"            "$DST/product/review-edit-copy.png"
to_png "$PSG/7. Export_Deploy/Deploy to Social.png"                               "$DST/product/deploy.png"
to_png "$PSG/7. Export_Deploy/Publish to Social 2.png"                            "$DST/product/publish.png"
to_png "$PSG/8. Control Center/Control Center.png"                                "$DST/product/control-center.png"
to_png "$PSG/9. The Wall/The Wall.png"                                            "$DST/product/wall.png"

echo "== campaign / proof imagery =="
WE="$SITE/carousels/2026-05-30-ig-one-source-nine-ads-cloudtilt-v2-white-editorial"
to_jpg "$WE/card-08-nine-grid.jpg"  "$DST/campaigns/nine-grid.jpg" 1280 86
to_jpg "$WE/card-03-source.jpg"     "$DST/campaigns/source-shoe.jpg" 1080 86
to_jpg "$WE/card-07-studio-macro.jpg" "$DST/campaigns/studio-macro.jpg" 1080 84
RA="$WB/Ads/2026-05-31-ig-one-source-every-ratio-rhode-brand-dna/cards"
to_jpg "$RA/card-03-source.png"       "$DST/campaigns/ratio-source.jpg" 1080 86
to_jpg "$RA/card-05-ig-feed-4x5.png"  "$DST/campaigns/ratio-feed.jpg" 1080 86
to_jpg "$RA/card-06-ig-story-9x16.png" "$DST/campaigns/ratio-story.jpg" 1080 86
to_jpg "$RA/card-07-linkedin-1x1.png" "$DST/campaigns/ratio-linkedin.jpg" 1080 86
to_jpg "$RA/card-08-youtube-16x9.png" "$DST/campaigns/ratio-youtube.jpg" 1080 86
RC="$WB/Ads/carousel-01-one-photo-full-campaign-v2-robot/cards"
to_jpg "$RC/card-01-cover.png"  "$DST/campaigns/robot-cover.jpg" 1080 88
to_jpg "$RC/card-06-cta-robot.png" "$DST/campaigns/robot-cta.jpg" 1080 88
to_jpg "$SITE/carousels/2026-05-29-ig-hospitality-one-photo-cocktail/card-06-payoff.jpg" "$DST/campaigns/cocktail.jpg" 1080 84
to_jpg "$SITE/carousels/2026-05-29-ig-one-photo-every-platform-rhode/card-06-payoff.jpg" "$DST/campaigns/rhode.jpg" 1080 84
to_jpg "$SITE/carousels/2026-05-29-ig-slop-vs-studio-brand-dna-rhode/card-06-proof-grid.jpg" "$DST/campaigns/proof-grid.jpg" 1200 84

echo "== DONE =="
du -sh "$DST" 2>/dev/null
find "$DST" -type f | wc -l | xargs echo "files:"
