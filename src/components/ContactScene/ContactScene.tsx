import { useId } from 'react'
import './ContactScene.css'

export default function ContactScene() {
  const sceneId = useId()
  const paint = (name: string) => `url(#${sceneId}-${name})`

  return (
    <section id="contact" className="contact-scene" aria-labelledby="contact-heading">
      <header className="contact-scene__heading">
        <h2 id="contact-heading">04 / Contact</h2>
        <p>A place for the next conversation.</p>
      </header>
      <svg
        className="contact-scene__artwork"
        viewBox="0 80 1200 740"
        fill="none"
        role="img"
        aria-labelledby={`${sceneId}-title ${sceneId}-description`}
      >
        <title id={`${sceneId}-title`}>The studio, after hours</title>
        <desc id={`${sceneId}-description`}>
          In a quiet, dark studio, a man in an overcoat, fedora and small sunglasses
          faces you from behind a centered desk. Cool laptop light touches his face.
          A warm desk lamp illuminates the tabletop, a visiting card lies nearby,
          and a closed door recedes into the rear wall.
        </desc>
        <defs>
          <radialGradient id={`${sceneId}-wall`} gradientTransform="translate(540 385) scale(660 390)" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            <stop stopColor="#19222b" /><stop offset=".5" stopColor="#101820" /><stop offset="1" stopColor="#060b10" />
          </radialGradient>
          <linearGradient id={`${sceneId}-floor`} x1="600" y1="530" x2="600" y2="820" gradientUnits="userSpaceOnUse">
            <stop stopColor="#111923" stopOpacity="0" /><stop offset=".35" stopColor="#101720" stopOpacity=".8" /><stop offset="1" stopColor="#060b10" />
          </linearGradient>
          <linearGradient id={`${sceneId}-coat`} x1="485" y1="412" x2="695" y2="565" gradientUnits="userSpaceOnUse">
            <stop stopColor="#252d34" /><stop offset=".46" stopColor="#1b242d" /><stop offset="1" stopColor="#0e151d" />
          </linearGradient>
          <linearGradient id={`${sceneId}-face`} x1="586" y1="318" x2="611" y2="387" gradientUnits="userSpaceOnUse">
            <stop stopColor="#414d55" /><stop offset=".55" stopColor="#778a94" /><stop offset="1" stopColor="#9fb5bd" />
          </linearGradient>
          <linearGradient id={`${sceneId}-hat`} x1="560" y1="270" x2="645" y2="311" gradientUnits="userSpaceOnUse">
            <stop stopColor="#303942" /><stop offset=".55" stopColor="#202a34" /><stop offset="1" stopColor="#151e27" />
          </linearGradient>
          <linearGradient id={`${sceneId}-desktop`} x1="390" y1="524" x2="690" y2="640" gradientUnits="userSpaceOnUse">
            <stop stopColor="#292e32" /><stop offset=".44" stopColor="#222b34" /><stop offset="1" stopColor="#18212a" />
          </linearGradient>
          <linearGradient id={`${sceneId}-laptop`} x1="535" y1="475" x2="663" y2="568" gradientUnits="userSpaceOnUse">
            <stop stopColor="#30414e" /><stop offset="1" stopColor="#22313d" />
          </linearGradient>
          <linearGradient id={`${sceneId}-screen-light`} x1="600" y1="481" x2="600" y2="370" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9fcce1" stopOpacity=".07" /><stop offset="1" stopColor="#9fcce1" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${sceneId}-lamp-pool`} gradientTransform="translate(399 558) scale(118 38)" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            <stop stopColor="#d5bd8f" stopOpacity=".19" /><stop offset="1" stopColor="#d5bd8f" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${sceneId}-lamp-air`} gradientTransform="translate(392 468) scale(95 120)" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            <stop stopColor="#bfa679" stopOpacity=".065" /><stop offset="1" stopColor="#bfa679" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${sceneId}-lamp-shade`} x1="363" y1="430" x2="421" y2="440" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9a998a" /><stop offset=".55" stopColor="#8e8d7e" /><stop offset="1" stopColor="#505b5b" />
          </linearGradient>
          <radialGradient id={`${sceneId}-ground-shadow`} gradientTransform="translate(600 751) scale(375 66)" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            <stop stopColor="#020609" stopOpacity=".9" /><stop offset=".6" stopColor="#020609" stopOpacity=".6" /><stop offset="1" stopColor="#020609" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${sceneId}-desk-reflection`} gradientTransform="translate(600 579) scale(139 37)" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
            <stop stopColor="#88adc2" stopOpacity=".085" /><stop offset="1" stopColor="#88adc2" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${sceneId}-vignette`} cx=".5" cy=".53" r=".65">
            <stop offset=".45" stopColor="#060b10" stopOpacity="0" /><stop offset="1" stopColor="#060b10" stopOpacity=".8" />
          </radialGradient>
          <linearGradient id={`${sceneId}-room-fade`} x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="#060b10" /><stop offset="1" stopColor="#060b10" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g data-part="background-architecture">
          <path fill="#060b10" d="M0 0h1200v820H0z" />
          {/* Broad continuous falloff replaces the hard-edged wall light block. */}
          <path fill={paint('wall')} d="M0 0h1200v820H0z" />
          <path fill={paint('floor')} d="M0 530h1200v290H0z" />
          <path stroke="#24303a" strokeOpacity=".12" d="M218 568h794M418 568 288 820m491-252 129 252" />
        </g>

        <g data-part="closed-door" opacity=".6">
          {/* Flush, parallel edges keep the door unambiguously closed. */}
          <path fill="#0a1017" d="M858 267h144v299H858z" />
          <path stroke="#303b44" strokeOpacity=".45" strokeWidth="3" d="M859 564V268h141v296" />
          <path fill="#121a22" d="M867 276h126v284H867z" />
          <path stroke="#070d13" strokeWidth="2" d="M994 276v285H867" />
          <path fill="#253039" d="M880 426h4v16h-4z" />
          <path stroke="#7e8178" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" d="M882 433h12" />
        </g>

        <g data-part="floor-shadows">
          <ellipse fill={paint('ground-shadow')} cx="600" cy="751" rx="375" ry="66" />
          <path fill="#03080d" opacity=".22" d="m354 607 441-6 179 161-195 23-420-20z" />
          <ellipse fill="#03070b" opacity=".8" cx="301" cy="762" rx="24" ry="5" />
          <ellipse fill="#03070b" opacity=".8" cx="899" cy="762" rx="24" ry="5" />
        </g>

        <g data-part="chair">
          {/* A shallow wooden crest and narrow stiles mostly disappear behind the coat. */}
          <path fill="#252927" d="M507 406v-20q93-24 186 0v20q-93-20-186 0" />
          <path stroke="#727064" strokeOpacity=".18" d="M511 387q89-22 178 0" />
          <path fill="#181d1e" d="m507 391 10-1 12 184h-10zM683 390l10 1-12 183h-10z" />
          <path stroke="#171d21" strokeWidth="9" d="m528 570-9 152m153-152 9 152" />
        </g>

        <g data-part="character">
          <g data-part="coat-body">
            <path fill="#0b121a" d="M523 527q77-15 154 0l-14 205h-43l-20-141-20 141h-43z" />
            <path fill="#060c12" d="M538 725h41l-1 19q-15 7-53 4-9-2-4-10zM621 725h41l17 13q5 8-4 10-38 3-53-4z" />
            <path stroke="#23313b" strokeOpacity=".35" d="m542 690 3 33m111-33-3 33" />
            {/* Curved shoulders and sleeves; facets are confined to the cloth. */}
            <path fill={paint('coat')} d="M568 385q-20 7-45 12-30 6-42 33-14 33-24 78-5 19 10 29l43 15 11-37 4 46h150l4-46 11 37 43-15q15-10 10-29-10-45-24-78-12-27-42-33-25-5-45-12z" />
            <path fill="#0b141e" d="m594 400 24-7 14 23-21 140h-26l-13-139z" />
            <path fill="#33424d" d="m574 385-29 24 15 23-7 9 41 66-15-91z" />
            <path fill="#293944" d="m626 385 29 24-15 23 7 9-41 66 15-91z" />
            <path stroke="#607480" strokeOpacity=".25" d="m574 390 5 26 15 83m32-109-5 26-15 83" />
            <path fill="#0f1922" d="m516 448-15 53 20 37 4-43zM684 448l15 53-20 37-4-43z" />
            <path stroke="#77838a" strokeOpacity=".22" strokeLinecap="round" d="M522 406q-25 8-35 39" />
            <path stroke="#496170" strokeOpacity=".24" d="m657 451 13 43-8 44" />
          </g>
          <g data-part="head">
            <path fill="#526570" d="M580 367v23q2 11 20 19 18-8 20-19v-23z" />
            <path fill="#273943" d="M580 374q20 12 40 0v13q-20 11-40 0z" />
            <ellipse fill="#5b707b" cx="560" cy="341" rx="5" ry="10" />
            <ellipse fill="#657c87" cx="640" cy="341" rx="5" ry="10" />
            <path fill={paint('face')} d="M560 324c0-28 14-39 40-39s40 11 40 39c0 24-8 44-23 55-10 8-24 8-34 0-15-11-23-31-23-55" />
            {/* One curved temple shadow, a quiet nose, and no mouth or cheek facets. */}
            <path fill="#354852" opacity=".25" d="M561 321q1 40 28 61-28-13-28-61" />
            <path stroke="#506873" strokeOpacity=".55" strokeWidth="1.3" strokeLinecap="round" d="M600 341q-1 10-3 15 2 2 6 1" />
          </g>
          <g data-part="hat">
            <path fill={paint('hat')} d="m556 308 7-33q2-10 14-9 15 1 23 5 8-4 23-5 12-1 14 9l7 33z" />
            <path stroke="#63717a" strokeOpacity=".2" d="M566 274q7-9 34 1 25-10 34-1" />
            <path fill="#0c141d" d="m558 296 42 4 42-4 2 12q-44 9-88 0z" />
            <path fill="#1d2832" d="M539 309q17-6 28-3 33 6 66 0 11-3 28 3 9 3 1 6-26 8-62 8t-62-8q-8-3 1-6" />
            <path stroke="#4c5c68" strokeOpacity=".45" strokeLinecap="round" d="M541 315q59 12 118 0" />
          </g>
          <g data-part="glasses" stroke="#0c151d" strokeWidth="1.6">
            <path fill="#101922" d="M570 333q10-2 21 0v7q-1 6-10 6t-10-6zM609 333q11-2 21 0l-1 7q-1 6-10 6t-10-6z" />
            <path d="M591 335q9-3 18 0m-39-1-8-2m68 2 8-2" />
          </g>
        </g>

        <g data-part="desk">
          {/* All desk edges and legs share a frontal perspective. */}
          <g data-part="desk-legs">
            <path fill="#101820" d="M346 546h14l-7 176h-11zM840 546h14l4 176h-11z" />
            <path fill="#101820" d="m285 622 25 2-2 138h-16zM890 624l25-2-7 140h-16z" />
            <path fill="#24313b" d="m285 622 6 1 7 139h-6zM909 623l6-1-7 140h-6z" />
            <path fill="#131d26" d="M309 629h582v14H309z" />
          </g>
          <path fill="#0c141d" d="M260 614h680v19H260z" />
          <path fill="#1d2933" d="M260 614h680v10H260z" />
          <path fill={paint('desktop')} d="M337 524h526l77 90H260z" />
          <path stroke="#73848d" strokeOpacity=".2" d="M337 524h526" />
          <path stroke="#637785" strokeOpacity=".4" d="M261 614h678" />
          <path stroke="#080e15" strokeWidth="2" d="M260 626h680" />
        </g>

        <g data-part="desk-lighting-shadows">
          <ellipse fill={paint('lamp-pool')} cx="399" cy="558" rx="118" ry="38" />
          <ellipse fill={paint('desk-reflection')} cx="600" cy="579" rx="139" ry="37" />
          <ellipse fill="#070d13" opacity=".45" cx="497" cy="549" rx="29" ry="8" />
          <ellipse fill="#070d13" opacity=".45" cx="703" cy="549" rx="29" ry="8" />
          <path fill="#070e16" opacity=".55" d="m528 559 146-1 23 16-167 5-13-8z" />
        </g>

        {/* Forearms overlap the rear desk edge; separate for later rigging. */}
        <g data-part="arms-hands">
          <g data-part="left-arm-hand">
            <path fill="#26323d" d="M480 481q-10 14-15 34-5 17 12 24l35 15 10-21-21-20 6-14z" />
            <path fill="#364550" opacity=".55" d="m474 520 37 24 7-10-18-20z" />
            <path fill="#101b25" d="m507 529 13 5-6 20-13-5z" />
            <path fill="#8b9da3" d="m519 537 14 4q7 3 11 10l6 7q2 5-4 4l-14-8-11-2q-9-1-8-7z" />
            <path stroke="#556b77" strokeWidth="1.2" strokeLinecap="round" d="m520 545 11 4m-12 0 10 3" />
          </g>
          <g data-part="right-arm-hand">
            <path fill="#182631" d="M720 481q10 14 15 34 5 17-12 24l-35 15-10-21 21-20-6-14z" />
            <path fill="#2c3b47" opacity=".55" d="m726 520-37 24-7-10 18-20z" />
            <path fill="#0d1822" d="m693 529-13 5 6 20 13-5z" />
            <path fill="#95aab2" d="m681 537-14 4q-7 3-11 10l-6 7q-2 5 4 4l14-8 11-2q9-1 8-7z" />
            <path stroke="#5c7380" strokeWidth="1.2" strokeLinecap="round" d="m680 545-11 4m12 0-10 3" />
          </g>
        </g>

        <g data-part="laptop">
          <path data-part="screen-light" fill={paint('screen-light')} d="m526 478 39-99h70l39 99z" />
          {/* Rear of the lid, with just a thin strip of the base visible below it. */}
          <path fill="#354753" d="M531 552h138l16 12H515z" />
          <path fill="#526572" d="M515 564h170q-2 3-8 3H523q-6 0-8-3" />
          <path fill={paint('laptop')} stroke="#566e7d" strokeWidth=".9" d="M527 478h146q5 0 5 5l-7 76H529l-7-76q0-5 5-5" />
          <path stroke="#9ab4c4" strokeOpacity=".3" strokeLinecap="round" d="M528 479h144" />
          <path stroke="#14212b" strokeWidth="1.5" d="M531 560h138" />
        </g>

        <g data-part="lamp">
          <ellipse fill={paint('lamp-air')} cx="392" cy="468" rx="95" ry="120" />
          <ellipse fill="#060c11" opacity=".65" cx="404" cy="562" rx="28" ry="5" />
          <path fill="#343b3d" d="M377 558q22-7 44 0v3q-22 6-44 0z" />
          <ellipse fill="#626961" cx="399" cy="558" rx="22" ry="4" />
          <path stroke="#5f6a68" strokeWidth="3.5" d="M399 555v-82q0-8-7-17" />
          <path stroke="#b4b39d" strokeOpacity=".35" strokeWidth=".8" d="M398 553v-79" />
          <path fill={paint('lamp-shade')} d="M375 419q17-5 34 0l13 39q-30 8-60 0z" />
          <ellipse fill="#b9b098" cx="392" cy="458" rx="30" ry="4" />
          <ellipse fill="#e4d2ad" cx="392" cy="459" rx="23" ry="1.8" />
        </g>

        <g data-part="visiting-card" aria-hidden="true" transform="translate(0 -7)">
          <path fill="#060c12" opacity=".75" d="m765 590 53-3 17 20-58 4z" />
          <path fill="#9babae" d="m764 586 51-3 14 17-54 3z" />
          <path fill="#bac3bd" d="m764 585 51-3 14 17-54 3z" />
          <path stroke="#50616a" strokeWidth="1.5" d="m776 590 14-1" />
          <path stroke="#7a898b" strokeWidth="1" d="m779 595 28-2" />
        </g>

        <g data-part="environment-lighting" pointerEvents="none">
          <path fill={paint('room-fade')} d="M0 0h1200v180H0z" />
          <path fill={paint('vignette')} d="M0 0h1200v820H0z" />
        </g>
      </svg>
      <p className="contact-scene__caption">The studio / After hours</p>
    </section>
  )
}
