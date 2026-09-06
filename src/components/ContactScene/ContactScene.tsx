import { useId } from 'react'
import './ContactScene.css'

export default function ContactScene() {
  const sceneId = useId()
  const screenLightId = `${sceneId}-screen-light`
  const doorLightId = `${sceneId}-door-light`

  return (
    <section id="contact" className="contact-scene" aria-labelledby="contact-heading">
      <header className="contact-scene__heading">
        <h2 id="contact-heading">04 / Contact</h2>
        <p>A place for the next conversation.</p>
      </header>

      <svg
        className="contact-scene__artwork"
        viewBox="0 0 1440 960"
        fill="none"
        role="img"
        aria-labelledby={`${sceneId}-title ${sceneId}-description`}
      >
        <title id={`${sceneId}-title`}>The studio, after hours</title>
        <desc id={`${sceneId}-description`}>
          A quiet charcoal studio. A man in a dark overcoat, fedora and small sunglasses
          sits behind a blue-lit laptop. An ivory desk lamp and a visiting card rest on
          the table, with a faintly lit open doorway beyond.
        </desc>
        <defs>
          <linearGradient id={screenLightId} x1="680" y1="553" x2="800" y2="352" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a0d3ec" stopOpacity=".12" />
            <stop offset="1" stopColor="#a0d3ec" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={doorLightId} x1="1070" y1="590" x2="947" y2="799" gradientUnits="userSpaceOnUse">
            <stop stopColor="#55778c" stopOpacity=".13" />
            <stop offset="1" stopColor="#55778c" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g data-part="background-architecture">
          <path fill="#060b10" d="M0 0H1440V960H0z" />
          <path fill="#0b121b" d="M0 0H1190V568L0 659z" />
          <path fill="#080f17" d="M1190 0H1440V665L1190 568z" />
          <path fill="#0a1017" d="m0 659 1190-91 250 97v295H0z" />
          <path stroke="#263440" strokeOpacity=".45" d="M0 659 1190 568l250 97M1190 0v568" />
          <path stroke="#18232e" strokeOpacity=".55" d="m1190 568-338 392M1190 568l151 392M0 828l1275-226" />
          <path fill="#080e15" d="M0 0h191v644L0 659z" />
          <path stroke="#15202b" d="M191 0v644" />
        </g>

        <g data-part="doorway">
          <path fill="#151f29" d="m994 244 158 4v327l-158 13z" />
          <path fill="#03080d" d="m1004 254 137 2v313l-137 11z" />
          <path fill="#1a2a38" d="m1100 269 41-13v313l-41-22z" />
          <path fill="#101b26" d="m1004 254 96 15v278l-96 33z" />
          <path stroke="#536d7f" strokeOpacity=".45" d="m1141 257 0 312-137 11" />
          <path fill="#607889" d="m1097 273 3-4v278l-3 1z" opacity=".3" />
          <path stroke="#82909a" strokeWidth="3" d="m1080 420 8-1" />
        </g>

        <g data-part="lighting-shadows">
          <path fill={`url(#${doorLightId})`} d="m1004 580 137-11-134 227-208 12z" />
          <path fill="#03070c" opacity=".7" d="m390 737 454-45 270 110-465 69-339-62z" />
          <ellipse fill="#02060a" opacity=".75" cx="790" cy="773" rx="145" ry="29" />
        </g>

        <g data-part="chair">
          <path fill="#060a10" stroke="#26313d" strokeWidth="2" d="M771 405q4-24 29-24h72q27 0 26 29l-13 211-126-1z" />
          <path fill="#111b26" d="M791 407q1-10 12-10h65q13 0 12 13l-12 157-85 1z" />
          <path fill="#080d14" d="m752 611 140-6 7 36-148 13z" />
          <path stroke="#28313a" strokeWidth="8" d="m823 646-3 104m-1-7-64 29m66-29 64 20" />
          <path stroke="#0a1017" strokeWidth="10" d="m764 636-20 122m136-124 18 116" />
        </g>

        <g data-part="character">
          <g data-part="coat-body">
            <path fill="#101923" d="m755 563 77 9 17 96-19 92-34-1 2-88-43-41z" />
            <path fill="#080d14" d="m718 561 71 7-6 109-35 68-33-12 27-75-31-47z" />
            <path fill="#05090e" d="m715 729 34 10 1 22-58 6q-13-6-2-15zM796 751h34l24 17q8 10-4 13l-59-5z" />
            <path fill="#151e28" d="m736 403 44-20 42 7 42 40-15 173-128 8-19-129z" />
            <path fill="#0c131c" d="m791 395 32-5 41 40-15 173-59 4-9-126z" />
            <path fill="#293642" d="m766 390 14-7 12 17-20 68-28-48z" />
            <path fill="#1c2935" d="m792 400 19-14 20 20-19 18 9 18-40 63z" />
            <path fill="#080f18" d="m775 409 15-9-9 91-12-44z" />
            <path stroke="#3e5261" strokeOpacity=".4" d="m736 406-13 29-12 58" />
          </g>
          <g data-part="head">
            <path fill="#787d7b" d="m768 362-3 32 17 17 18-23-3-31z" />
            <path fill="#a2a7a2" d="m750 324 50-5 11 28-14 34-21 8-21-17-8-27z" />
            <path fill="#69777d" d="m784 324 16-5 11 28-14 34-21 8 10-27z" />
            <path fill="#b7c5c5" d="m750 343-7 14 11 3z" />
            <path fill="#818d8d" d="m800 343 8-2 1 12-7 6z" />
          </g>
          <g data-part="hat">
            <path fill="#17212b" d="m745 316 5-41 25-10 27 9 15 47z" />
            <path fill="#23303b" d="m750 275 25-10 27 9-24 1-17 12z" />
            <path fill="#080e16" d="m747 304 65 3 5 14-73-2z" />
            <path fill="#101923" d="m725 316 29-3 66 5 20 11-33 6-68-5-21-7z" />
            <path stroke="#354552" d="m725 323 51 7 44 1" />
          </g>
          <g data-part="glasses" fill="#0a1118" stroke="#151e26" strokeWidth="2" strokeLinejoin="round">
            <path d="m749 339 17 2-2 10-11-1zM775 342l18 1-3 10-12-1z" />
            <path fill="none" d="m765 344 10 1m18 0 10-3" />
          </g>

        </g>

        <g data-part="desk">
          <path fill="#121c27" d="m430 551 389-36 159 67-410 50z" />
          <path fill="#1c2935" d="m430 551 138 81 410-50v14l-413 52-135-83z" />
          <path fill="#0b131d" d="m565 648 413-52v13l-413 53z" />
          <path fill="#111b26" d="m449 577 15 9-13 165-11-5zM943 611l15-2 18 151-12 3z" />
          <path fill="#1d2934" d="m581 655 18-2-9 170-13 2z" />
          <path stroke="#536878" strokeOpacity=".45" d="m433 552 136 78 405-49" />
          <path fill="#080f17" opacity=".6" d="m612 584 124-12 83 21-148 20z" />
        </g>

          <g data-part="arms-hands">
            <path fill="#1b2834" d="m734 414-20 9-32 95 51 34 22-23-36-26 27-59z" />
            <path fill="#101a25" d="m835 414 25 14 24 99-25 20-63-9 2-22 48-3-22-65z" />
            <path stroke="#304452" d="m719 504 30 23m96-12 16 5" />
            <path fill="#8d9d9f" d="m747 525 19 5 15 13-6 8-29-7-10-8z" />
            <path fill="#a4b4b5" d="m800 518-16 5-13 15 9 5 13-9 9 2z" />
          </g>

        <g data-part="laptop">
          <path fill={`url(#${screenLightId})`} d="m624 552 135 4 77-162-115-34z" />
          <path fill="#536a7c" d="m623 557 120-14 40-27-117 13z" />
          <path fill="#1d2d3d" d="m646 550 89-10 30-19-92 12z" />
          <path stroke="#738c9e" strokeOpacity=".45" d="m661 540 87-10m-81 6 87-10" />
          <path fill="#435b6e" d="m685 534 37-4 10-7-35 4z" />
          <path fill="#7998ae" d="m623 557 120-14 40-27v4l-39 28-120 14z" />
          <path fill="#233a4d" stroke="#658aa4" strokeWidth="1.5" d="m605 461 116-10q4 0 5 5l17 87-120 14-21-91q-1-4 3-5z" />
          <path fill="#2b465b" d="m610 466 110-10 17 83-110 12z" />
          <path stroke="#a0c9df" strokeOpacity=".6" d="m606 462 116-10" />
          <path fill="#accbda" opacity=".6" d="m670 501 9-1 2 8-9 1z" />
        </g>

        <g data-part="lamp">
          <ellipse fill="#060d14" cx="517" cy="569" rx="42" ry="9" />
          <path fill="#6c6b61" d="M491 559q23-10 44 0v6q-22 9-44 0z" />
          <ellipse fill="#a4a394" cx="513" cy="559" rx="22" ry="6" />
          <path stroke="#8e9289" strokeWidth="5" d="M513 555v-83l-16-28" />
          <path fill="#ddd7bf" d="m479 405 29-3 23 46-70 3z" />
          <path fill="#a6a695" d="m499 403 9-1 23 46-19 1z" />
          <ellipse fill="#eee4c9" cx="496" cy="449" rx="35" ry="5" />
          <path fill="#e6dec2" opacity=".035" d="m467 453 58-1 39 114-97 7z" />
        </g>

        <g data-part="visiting-card" aria-hidden="true">
          <path fill="#050b11" d="m833 574 40-4 22 11-42 6z" />
          <path fill="#aaa99c" d="m832 571 39-4 22 11-42 5z" />
          <path stroke="#575f60" strokeWidth="1.5" d="m845 573 13-1m-8 4 22-2" />
        </g>
      </svg>

      <p className="contact-scene__caption">The studio / After hours</p>
    </section>
  )
}
