plugin.onLoad(async () => {
  const css = `
  * {
    color: #ffffff !important;
    font-weight: 700;
    text-shadow: 0 0 1px rgb(0 0 0 / 50%);
  }
  ::-webkit-scrollbar-track {
    background: none;
  }
  html {
    background-image: url(http://pic.majokeiko.com);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #ffffff14;
  }
  body#music-163-com {
    backdrop-filter: blur(5px);
    background-color: #0000003b;
  }
  header.g-hd.s-theme-bgc1 {
    background-color: #00000000;
  }
  .m-tabwrap {
    background-color: #00000000;
  }
  section.g-setHd.j-flag.n-set {
    background-color: #00000000;
  }
  section.g-mn.g-mn-set.j-flag {
    background-color: #00000000;
  }
  svg {
    fill: #ffffff !important;
  }
  .webp {
    background: #ffffff !important;
  }
  .m-nav .newlist::before, .m-nav .newlist::after {
    background-color: #ffffff;
  }

  .m-plylist .itm:before,
  input.j-flag::placeholder {
    color: #ffffff !important;
  }
  .bg.j-flag.z-show {
    background: #0000003b !important;
  }
  div.u-arrlay.m-userlist {
    background-color: #000;
  }
  div.u-arrlay.u-arrlay-msg {
    background-color: #000000b5;
    border-radius: 10px 0 0 10px;
  }
  div.u-arrlay.m-schlist.j-flag.j-search-body.z-hashistory.m-schsug {
    background-color: #000000b5;
  }
  .u-playinglocation svg {
    fill: #000 !important;
  }
  div.m-layer .lyct, div.m-layer, div.m-layer .zcnt {
    background: #282828;
  }
  
  li#n-side-look,
  a.u-headtit.f-ff2.f-fwb.f-cb.z-osx-appstore-hide,
  div.p-recmd.g-recmd.g-wrap5.q-lrc.j-flag .m-banner,
  div.p-recmd.g-recmd.g-wrap5.q-lrc.j-flag ul.m-list.m-list-recmd.m-list-recmd-live.m-list-flow.f-flex.f-oh,
  div.g-singlec .recommend.j-flag,
  .m-myradio.j-recommend-content,
  .g-singlec-comment.j-flag,
  .g-mn2.j-flag,
  .g-singlec-comment-detail.j-flag,
  .g-bd2.f-cb {
    display: none;
  }

  section.g-single {
    background-image: url(http://pic.majokeiko.com);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #ffffffad;
  }

  .g-single-bd {
    height: 100%;
  }

  li.gd.j-flyg a,
  li.mix.j-flag a,
  li.rdi.j-flag a,
  li.cloud.j-flag a,
  li.xz.j-flag a,
  li.lke.j-flxg a,
  li.j-flag.fsection a {
    border-radius: 25px;
    transition: all 0.3s;
  }

  li.j-flag.fsection a {
    padding-left: 32px;
  }

  li.gd.j-flyg.z-sel a,
  li.mix.j-flag.z-sel a,
  li.rdi.j-flag.z-sel a,
  li.cloud.j-flag.z-sel a,
  li.xz.j-flag.z-sel a,
  li.lke.j-flxg.z-sel a,
  .m-nav li.z-sel a {
    background: #f85f89a3;
    box-shadow: 0 0 3px #ffb3d6;
  }

  li.gd.j-flyg a:hover,
  li.mix.j-flag a:hover,
  li.rdi.j-flag a:hover,
  li.cloud.j-flag a:hover,
  li.xz.j-flag a:hover,
  li.lke.j-flxg a:hover,
  li.j-flag.fsection a:hover {
    background: #ff7b9f70;
  }

  div.j-hostplst ul li,
  ul#my-music-list li,
  ul.sys.firstlist li {
    margin-bottom: 5px;
  }

  .m-fm .fmplay .covers::after,
  .u-txt,
  .m-uinfo,
  .m-timeline .m-dtool {
    background: none;
  }

  .m-player, .m-player .spk.z-silence:after {
    background-color: #00000000;
  }

  .m-fm .fmplay .btn,
  .m-fm .fmplay .playbtn {
    background: #f85f89a3;
    transition: all 0.3s;
    border-color: #ff7b9f70;
  }

  .m-fm .fmplay .btn:hover, .m-fm .fmplay .playbtn:hover {
    background: #ff7b9f70 !important;
    border-color: #00000000;
    box-shadow: 0 0 3px #ffb3d6;
  }

  .u-arrlay.u-arrlay-dn.m-queuenotify.u-arrlay-opacity {
    background: #282828;
    box-shadow: 0 1px 6px 0 rgb(32 32 32 / 88%);
    border-radius: 25px;
    height: 48px;
    width: 192px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    bottom: 64px;
  }

  div.m-queuenotify:before {
    display: none;
  }

  section.g-sd {
    border: none;
  }

  .m-nav.m-nav-s {
    border-radius: 24px;
    background-color: #2424243b;
    margin: 0 10px 10px 10px;
    width: 180px;
  }

  div#main-player {
    background-color: #2424243b;
    border: none;
  }

  .m-playlist.z-show {
    background: #282828;
    border-radius: 24px 24px 0 0;
    margin: 10px 10px 0 10px;
  }

  a.col.col-3.s-fc4.src {
    background-color: #ffffff;
  }
  
  div.brtAndEnvSoundList.j-brtlist,
  div.u-arrlay.m-schlist.j-flag.j-search-body,
  .brtlist.j-brtlist {
    background: #282828 !important;
  }

  div.brtAndEnvSoundList.j-brtlist:before,
  .m-player .brt .brtlist:before {
    border-color: #282828 transparent transparent #282828 !important;
    background-color: #282828 !important;
  }

  .cvr.u-cover.u-cover-recmd {
    border-radius: 24px 24px 0 0;
    box-shadow: 0 3px 1px -2px rgb(0 0 0 / 20%), 0 2px 2px 0 rgb(0 0 0 / 14%), 0 1px 5px 0 rgb(0 0 0 / 12%);
  }

  .desc {
    background-color: #2424243b;
    height: 48px;
    margin-bottom: 0px !important;
    border-radius: 0 0 24px 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 10px 14px 0px 14px;
  }

  .m-list-radar li,
  .m-list-recmd li, 
  .m-list-excmv li, 
  .m-list-artist li {
    width: 25% !important;
    padding: 24px 12px !important;
  }

  .u-cover .ci {
    padding: 10px;
  }

  .mq-offline .m-plylist .itm.z-hascache .s-fc1, .m-plylist .itm.z-cloudlocal .s-fc1, .m-plylist .itm.z-hasdown .s-fc1, .m-plylist .itm.z-haslocal .s-fc1, body:not(.mq-offline) .m-plylist .itm.z-hascloud .s-fc1, .m-drank li.z-cloudlocal .s-fc1, .mq-offline .m-tblist .itm.z-hasdown .s-fc1, .mq-offline .m-tblist .itm.z-haslocal .s-fc1, .mq-offline .m-tblist .itm.z-hascache .s-fc1 {
    color: #f85f89 !important;
    text-shadow: 0 0 1px #ad0050;
  }

  span.heartbeat.f-cp {
    display: none !important;
  }

  ul.discover-podcast,
  ul.m-list.m-list-excmv.m-list-flow.f-flex,
  ul.m-list.m-list-excmv.m-list-excmv-mv.m-list-flow.f-flex,
  a.u-headtit.f-ff2.f-fwb.f-cb {
    display: none;
  }

  div.j-flag.u-tab2.u-settab,
  nav.u-tab2.f-cb.f-ff2.j-flag ul.j-flag,
  ul.m-tab.j-flag {
    background-color: #2424243b;
    padding: 0px 12px;
    border-radius: 32px;
  }

  div.j-flag.u-tab2.u-settab {
    height: 54px;
  }

  ul.f-ff2 li {
    padding: 12px 0;
  }

  nav.u-tab2.f-cb.f-ff2.j-flag ul.j-flag {
    padding: 0 0 0 12px;
  }

  ul.m-tab.j-flag li {
    margin-right: 10px;
  }

  .m-tab li.z-selected a::after,
  .u-tab2 li .z-sel:before {
    content: none;
  }

  ul.m-tab.m-tab-1.j-flag {
    width: 280px;
  }

  // ul.j-flag li a.j-flxg.z-sel:before,
  nav.u-tab2.f-cb.f-ff2.j-flag ul.j-flag,
  .m-tab li.z-selected a:after {
    display: none;
  }

  a.u-tit,
  ul.j-flag li a.j-flxg,
  .m-tab li a {
    padding: 10px 16px;
    border-radius: 28px;
    transition: all 0.3s;
  }

  ul.j-flag li a.j-flxg {
    padding: 2px 16px !important;
    margin: 8px 10px 8px 0;
    height: 100%;
  }

  ul.j-flag li a.j-flxg:hover,
  .m-tab li a:hover {
    background: #ff7b9f70 !important;
  }

  a.u-tit.z-sel,
  ul.j-flag li a.j-flxg.z-sel,
  .m-tab li.z-selected a {
    font-size: 14px;
    background: #f85f89a3;
    border-color: #ff7b9f70;
    box-shadow: 0 0 3px #ffb3d6;
  }

  a.u-tit {
    padding: 0px 10px;
    margin: 0 !important;
  }

  .m-tab {
    width: 543px;
  }

  .cvr.u-cover.u-cover-list,
  .m-list-radar li .cvr.cvr.cvr:before, .m-list-radar li .cvr.cvr.cvr .lnk {
    border-radius: 24px 24px 0 0 !important;
  }

  li.mv.j-flag {
    display: none;
  }

  .u-select .value {
    background: none;
  }

  .u-cover .lnk {
    border-radius: 0px !important;
  }

  li.j-leftfix {
    display: none;
  }

  ul.m-list.m-list-recmd.m-list-flow.f-flex {
    justify-content: flex-start;
  }

  span.ply.f-pa.f-cp svg {
    fill: #ad0050 !important;
  }

  .cdbox {
    background-image: none !important;
  }

  .cdimg {
    width: 80% !important;
    height: 80% !important;
  }

  span.u-tip {
    background-color: #ec4141 !important;
  }

  a.j-goto.m-newSongTip span {
    color: #282828 !important;
  }

  span.j-flag {
    font-size: 14px !important;
  }

  .m-player .brt .brtAndEnvSoundList .envSoundList .envSound-item .envSound-switch::after {
    background-color: #ad0050 !important;
  }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);

  window.onload = function () {
    document.querySelector(".m-logo").querySelector("a").innerHTML = `
    <div style="background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQgAAABmCAMAAAAAof9TAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAMAUExURQAAACib4Edwvh6b40N9xT6Dyy2e4f///0V+xC2e4hqe5lez5S2d4UB0xEtruR6W30FxxE1quDt4yB2U3h+T3FtmqxyU31hlq+/2+/v9/gSd7fb5/Uus4wis9lOx5CSR2g2t9FGv5Auu9QWq9g+o8Th6yQqt9Qyq8wyu9Qys9Q6t9BiY4zJ51hB22Qyt9Q+r8wKR5Uus4xeW5B+g5g2s9Q2u9XVgkget9xyg50xawCWK4aW32gad7Rma5TB1zU5cwjdux0Ku5iaX3Dl8x0yIvQ6r8wOn9FxnoE2Jvy5/2bLQ7hCW5Ojz+8XQ5SmC3HlfjT5tzDNzzubr9E1cvzlw0LjG4EpbwTeZ1KPI7Baf62NvomJxpd3u+3tfjQp+3nSv5U2FvRiO4QWv+JS+50BszVKx5RyK4ntdiQCg9c/k9SKn6zhtzxGh7SaA1iOL4iK19j56tiJp0NLs+17H+FSBt9zl8ntchy5+2TF72G2e0XJsm2Z4qjF82MHa8kSNxkSGvtPd7U5ZwTat6Z3a+TSX015qpX5ahiNssuzx901awUqCuTOY1DSW0nlaiLDh+RuT54GO0xxw1EK/90duqbrZ7khamSuS0XSOu25xoi+Cwk5awSeR0V9pnV+QwjRqqozS9kKLxFSazVhvp21vnjB92DxGuZem0UqNxACP6jhzsYO56gqC4cPo+yOi4lmb4Xxbh0Cy7jdw0Qlo1H9ahR1Wxoau20ZgxjN+vEiQyCxAuE5jnU5ZwTKV0xaHyyw8t3TK9TtIu1FspCai4RNezBBr04OhyVBVvyNbyEmK2lGb0XRplx+HymSq4ip72DOr6EJyzxtyuAV5ytXg7l6Ft0KZ4zal4ylXmzBmzHlnlk2AuPr7/Wx8zk2e1GR1qM3L3dnX5GC98HabyJKApcbI3JrL6kqaz5vM66SYuFxelUJJkp+qy2JZj7SvyGpTh4+Ns2xIe761y+Dn8aifvQR7zTVWw7u91HG44yFMn0tFf0JGuZGs0qfB3pK/4m+14WqZyv///27ApGsAAAD/dFJOUwAaLTIDDCP9Byo5ahI2JGVNG0FYTBNyQv397/0113ZDoVzC7UFWzEu3bJOG/fyGeeNEn6pgrTP7tX/7+96TaPaUg39gmVXhYKyn+9b9+/1FpnP7WoD6bKb6wXT9/CHj+m+74vu6T8tX/Pztzc6D4/P8/Pv4/Pxqlrn31aTF/PuC+76W+ZJSmbrblb+5zdD66/bX9f3UsPr88P2k1Jj7/vjfjcqJ1935z/PZ+/X6xvl+8fn9uub40ue65/2x6/b79/nj2fzo/dLW9fmy6PXscej8uOKE+FD+6/DU6PN9vOX389ft0L2c1e/yfsbg2vfC3fTKrJrQudPGv8/f3aSxuOD+WeoAACAASURBVHja7ZwHWFTX1vcdhpkzA0Ovw4B0EFCkqSgdBBHBKIqCoqBIIiiKAioxKgIKNkSFEBXEitjQGDAaTTT2gr0ldmONSYwlaoq55/2vfQZLxJR78+b7nve6HlEcYJjzO6v819p7T4sWb+yNvbE39sbe2Bt7Y2/sjf1DpimD/Vs/iZ/T/D+DQSKSyuVyqUgk+YvXpKmgn/w3fvC1WCUw2cu3CA/8M6g1RXJDa2NjY2trsVwq+UsvWyR2cHB2dnDQkksVmn/LDdHQ0NHQFSmesZAY6GpoaOiayP4BECKxtZGeaaipqZ6RsZZc8RcISrWcfVzatnVx8XF2EP81hs2ZQq6j7wjTN9TRNRG4mmjoGOrr4wENg/91r5DIrfVCC/vCCgtNjaz/AgmF2NnF3dXGxsbVva2Ps5Zc8p9yMHQM7J3Ru3fPQEdDHXbhJhp4qKfwgK7kf9shDMNC+85YuHDhzBkz+obqMRIyhUgkUvxB4GtKHXzc29k5OdnZtbNxdwnXkv5H/iuTGob1HtsVNnZs70B9IiHTxUPBPXr0CKYH/hdIaL6QfWRSa73CGTMbDxzYdmghSBhpIfdJxVpaWmK56Hd/tUTs3NbGzmru4MERVnbtXNuGa4n+I88UO/YcO27YnDlz3hvXNSNQX8NAYqDj2DN4yA/7hg3pEdzTUUf3700UmiYGurq6Bibq+63QcTTtu7CR581zohoXzijUMxaLxdbGRnpCxvgdp1Bo+bi3ssrioku2j4xwaufq4vAfuYRIHJbR9b3chrr9QNG1d5ihrq6GYWDwkGG5DWeBIrgnnOTvJCEz0DA01DdE+iEYJiIpRcbCAyoeZr5tJoLDGBRC3QrdQpExxKLXkxA5+LjaRWynH+RKBtvZtHX+j7KEyDBw7Lg5E3hemdOwfNxYXLeGjmPvHsPO5vE5ufXDegQHGmrQK5b8PTQ0DXT0w5KTk8MoN5MZOiYXbl68LY04JG2bOaMwVI9y5wxfX+8AN7jHa0kgRbjYqEHw3BUnm7bhfwOIFPZs++eQSxjqwyH2HaV7FHd0WI/eyJgaVEsNJH8m5v/ATDT0kyd1hk2aBBiwsORJfVcuPoQ7kfj+p9sWzkTtAIaZ3XZ2W+jr7WYKEq8F4exi42RfTQQL5v5dHpFEIFYfJpfAa+vdY0h9A0cPNeyDSziikuIDtbQ5r5AIMW/wpzSHJvLwpMjpRdOnR0YSjEmAErl58eL5UTwf9en727bNRO2YMXPhoaToqJ3d1nm7oYq85upkcuRKJ/sSvMq5FoOd2rn7vJgjNCUKheKveLGmAKIO/lC36/Dy97pm9OzZGxniLG6RKr7hKLJE7554CNU1TP/VvKkpMdDQMWOm0SRCfjdD6Oond55+9eqXq1Z9STAiIzdvXrl48cT58TzHQMAnZs7c9indGFUjSKCKiF6X5cPd21nZj4YrdbC3auXa1lmsaBLeckvP1FRb29RUT0uR7M9UMZlMIWUg9iv5xFGjDsMlUEV7DBm2bz8comFX/VmqHMFUSlFL+7xCQtNAw0y/Vx+yXr3M/kSllWjon4xc9TMX65e9SrCPyeYfa+D5lGOfwg4dOvTpp42cEPjdfANMjeWy18ipcBSNkeY8X2JPgQEdoSkINE9bbW3tloJp26ZaijT/SFjD5GJjBkLFp7Vu3frw8uXvjRs37r3l9X48nzZq1IdHh4FEjyGopT9QLdXXeUlpUubr1afjtGkLFkyb1rFPL7M/JAEQkyJXVeA6VX5VVbnP7EA8QuNAYxKzxhRzlgF58w3rvEKNxM0/qUjLx7VVxFw81fYIFhgshmTyVG1txiGETGDhKfrdTkdsDUOpQvVkINoQid1zlsPOfoiXUrfrww+PggRs3/m48/s2CbX0ZQ59Oi7YOnnyTz9N3rpgWsdeZhomfxgaJyO/zI5lN5yn+87B6C/2GXvkBYvv5v06EDIUDaF6ckKmZIGh8HyOIT8ffx0RUFhKXsuBdTqwjIyx45Yf3m8ugBhVV7f78OHDu1BFJoz68EOBxNH6o7E811C/qUdwH0MNyYu3t8+0BZN/WrFi7158bCUSf+ATMl0z5IhVMc+vVRUdba5SKs3xDyw6DZaYmDh69Oi0tNFpjQshNcWK1zQayJURBUgRlCHgEIoWmnJbAUPLIyFt27q7ox/zCT9ta6vdUjtV+rp+xVgvlAnrrl3HLX8GYmMdxyXtaj2qNWrnfjjEh2fJ6qEpqIKARG/HF1zCwKxXxwV7V5yPy4uNzatZ8dPkBURC9vsygoGIw9MhNMhyG3IPTJyIP8wOIDAOvP/Mus3sixzBXJ6qADMJzXAkCil0pZArC+ytWGSIRJ7qzHDEB02pK9oxV2rGxGJPQmGp2WwNtkZEDHpbsBGH23RnINq0jsYrTNq1K57jU3aNImMoooSbV7pvCFxCV/O5m/eZNnlFjfrWxoEEfOLF2GnGDMzCAAI/o8xelAk71sBFx6YdODZfbYmcisrH+58SB9JXelror2XoPtB+iMnkzMRazi6uyJVKns8ij3Bx1tIKDxHsSHi4i7tNK7vhw1vZuFIzplBY2jZPQiY3Nh07aOe2EQPJdrfZ2CaaT9u4cWM8xaiydWv8MyFqAlkeLFYdudFHf+jRU19D9jwyOi74qRQ5La7GL4eR2Dqtj5nG7waHiU6Xk9NX7cGzVWRmwzJz8eTmVQDBPOJTMI9OAoYDILENTRgpKoVCSt0HWXi4s2DhPi7u7ZwisjheOdLeyg7dp49LvqtrPsyF3KGdnX/69nR/p6ZmjJKHZdPVPxcYBMLr7Ubl6AlR8SmrVyclrTbnE5OS4oULjor6Tc5qstLfgOjVcSscIiZox2ef7UCZ8duydyu5hOx3lWWXkxdXVeDJcs+QR2RmR/MTjk3MiRIc4thqjnv/2KfvT+CioDMFh0AzqmWsZ+omWFu1ueNareyRIkZ3sB/shFvv2q5VO5iNqzu+1MrJf2Q0b37F34mchbKMzLKJhBQaI9VS8QKIEYn8a4xLjCKLj4onS0nBH7+UlIajVDd0XwIBjyj9bEcQWCABlq6YPK0P+lcTE5PXzfkkGlNOXvy8AjnIr6KqCh6RmQMBkQM5NTEF2WJ+Cqc68P6BNNyJnG2HZlKqFClESGhuXt6+ZN5kNrB2reysIliKGNph8GAnu1Z2TmR2oIFPrSJGUpRz1f7PKytIyDU1JWIkjJa2ahCUIwIGDTzFej5OFY1iqaRcTTl7Avof1X4hQzDbtYv+1NfX70PjEfY8R7DQ2BsUqzwf5Bez47NSjo8N+onyJWtNqDfRbB7E+KWon8oYFacyj83JUfHmJBu4CTmon0oVr4xWccwjJxAIRAYcwijUa103tQ0XDNcaYUEpYu7QDvb2g60GC2ZFFjHY3n6tcEur/UlriUlfKjxbamshxx4JCdEWN40lRWI8N0hExSc1njrVBop2QndmrdtsjGKVgxnqxqhd+9OiqYKgjpKkeq4U0Df0mbZ1xXlcEFe6YwdAMJeAsCLTB49m2jSZLoH4HClljx9JCE6l4lWxMFVKLq6KmKjShPuRQk25kRZEH+6a78741VeubNiwIV2wiAh7e/uhSBHRHTp0GPmqlTQ59xV/dUmRyrWO5B9xDm8LfWFkTWMfYkGDQjevQW9TrlyzZiNARG1sw0hsTOK4qI2t1TZq14cpcBvz/aOOUttBYxrNFxIfyufkFUGlped3BO04DxA1TE0I1gcsXh15AkQ/gEA9rllU47cnN7sqmo+jXDFx4vzclIkHKFobjrGaIRQNYzHErylA0FfgMdHR0UxmMIvmeFViYjRpEPoDRaJSKZlEe2Zr/VlJEWs5OIe7uHq7uQWgvRcGxWKpQiYR4m4QKuiIEZ3aQD/FCxzaoP1KhJBQYxiVJJSMnA+p60BH/qJggjoiEj+s2EJJgjyiZsveyVu3LliwdSsJTWjuV0jgZ9Qg/BbNmzdv0SKahMTGNUw8BhLH5lNYKpEoGQpqykP1jCF/9dy8uzVy/J835mycElAKKDZ8qMi4BwR4JySwPOPlBRh6hILGgtZGpm4B8IoRI9qgXKxmINp0j0aC2KjG0DqJpVMumuNy6+EQgfovS2gTDZLYkzdtCgoK+swPArl0S9DevXsn7/1pBRPdHSlzNgsCmdVvXnb2ouwcKsvmeNEp4JBrzim5xAYVZ57y/qesKZ/RtxD3DuKv77puV9QkOKV54ui1JQUF2wtQPLdnNRkSZ3TW3Jds5IYNEagoqCPevgkJdgkJ/v5Cnknw9fYiFIyEXMvYyDR0LEismcBzSW06UWC0UfF1G7sDw8ZR+1OiSf1HR+W2rks6erYZEGg+BRJwiCD0D0qESNCKFSu2lPqVBjGl+YqseBHEvEV7zLnYWN4vMwa3sOpYCselNXDK+QdwI6NTDlArulAggVvmvc5jQ9rokurtyBTIERaw2u0cv3aohT1Zh6FDkR5Lhg5F4oyIiLB6ZlRHbNolQF35+3v4p6dvoDzj7+HRLcEXKIy0kD1oVgzWXQeN6D6a505tbANLSTkFr2izcWPrxigVpbKoRgoQpIqjR4cwga358mUhTUwjEOQQfAz0BCyIFHSsX9AK0ty/UZovgDiTje+LrYrh4xYtaoiNyZ3AcTnzqzjuwLED5rgBygkpjQe2scG2MTnvjJ0es2d7wHBH/f390+3tLXDp1RasUAy279AB3lsNTUGX/pJROXWy8rew2FA9WqWkq+KiS66kA4V3gCkNzSUQ7GJSmANHmPOquk6nTnVCiEyAzOzeGB9NnfKEpP2gQLWD2o5mXEJG/SeBoOLJc35BpTV+cXnqJlpZs5eUpq7ma0DswffFZC/K4WMyM89UxeEVxs+H4uYPQGWmCWGgVMZT22VNdww+wYzUxLqE4XAKVjwtcOF2diBBk4kse5IUTFQJhoajXTvICisLi+3w78QCpXlWVnUJNIayerbHcF9GAj4rEfREHW4A0q1SSb88LSlKJVxJGlFgVRQsRp09K8gI2UtJwpDS5aYt55k2V72csM33TiYQsuZB4Ftz9sybl00gquLMeS5mIoQ2QOTOnzh/fopSyAcEQs9aLGbaMqDJvLxBwgKREW2PHEASysp+Li5iLhwCIjPf3SXchxnEtk0rSA6LudFc9PaRQ2tLuA1ramvhHEpedcWDDX5oKqoWVknPUq36EhKj2f/2q6tH6w937Uoyz93HgsPkNxymEQeVOlGrYvNiYoUnU8WU/q5HqOIqgCEb2ipnEcUVl5ObOfFYClVPKiAHouCQCA2aax+xhbGhgamenp6RnmnbAF+AgFYosLCCA9iQ2s4CebQdrdx9wsOPHHGgJSItB9Z9OUVYFHCqrKFkifz2WgsLf4/adPx0NfkEm4rKpNam0FU0fahLaqyrS6MSMWF1HSsjUVzKRjWGUXWocuZH0X0GPleWSJXEYauag19pTel5tdbG7UW2/J0cQTrizDwBBJeXmY0w4bg4gGhAgTpGDdj8+QcOHTpEC4F9hUETGzkd0TNy0BLixD+dYuE5CLQda+0H20E9OTic1rZFy4kk6MxaM8hMpNGhHTqQAttQ60/K1KO2mue3eyTQ5EckU7CeYyCuMoly5UZcf0ob9SenGrk0tZggDNSM1Q+jpkvyPD/06hgMfyiFG3M1QqLc8VkNtZPnt2z5aW/zVaNJUO35pH9FTfa8eRV+VZmLqggDs9wDx/CHUBxavHAmMNxY0lLbloYrhIKmTae1ILm9EzyukAsgRVBoOEU0TSYQFPge1mBBLDm3tWllBQ4FhIFVlrUW/iievgnD/WuBboMHcwkRKW1var64ujWdOnVqgyb41EaSEwBR150G26iiq3Oagj5337PY0DTR1dEP7N1j8g9bSmnUVvpZEDOWNfOCtkBNkKSa8oqO0CAQHyB8Kj6ZV8HFVsxbdGbRvEUxfN4imk9kZx6jKhpPXfliWhW+UXhB77SnpaUwlgYNNoojj/CAb5dY2KdTskQWoBSRZe/k6kLDOXxLqoS2DfiQQxSQP3QgEHM5bq7FcF8vZBnf4R4Wifxaj+HkElK0M27oOJB0OjEQuPN1JKxIajZuRC88qg5VlFw9J75hAh8HEGHM1yUIC8eewT2G/LCFhJT5+Rc4cDE7VggYmlGWkvZTlgGEOa+s+KR//1jOPIYmHjlKPicmJ5YZ1Ss+58DHi1du7lsYegH5IZVAMPMURnEh+d6+3dIRj1cQ70w0RFhUc/CPwQDhc5p9l62IVj5cbOysstCPCByGjgY6f1/Xti6moURiO56hm6+bnpZc3pQrJxCHTmvSoCdIWAkgktAJUgZMjEra/2F9/dnc81Q3dHRNTAw0yB2Ch2zaVw8twMUGfUatOOPAcX5bWMfRh+b7ryx1mAAE2nAlb17Rv3//PBrhCmm2SRarC0/uxys331hy4cIRbQLRRELKRvUEYh1dBV+yPWsu01b2FBkl9gDh4yCVsBGuXFj5cMJXshgHZAjEgv9wdKPOzvCpBI90DvkyIYCqEksRUTyX0oZAdMrhVQDRqXub1ZQ1ILcZhNa7d8+Zs3zYMLYm7GiIFltHcIdN9UcpbGKCPgtCnvxsB+NQ+pl6jquj28yIxqR9l2UXv7mFew4O82IgNirIsmsAIi6bhpiZ8RyfUwWH6DvJ0drTM5UqBqGQyy09PeVAIYDo1tRfqtZWz7WvzWKRYWVn40LDB0kqJQkFDfyZQwgcOpijK3dCWUFJcTYNSPC3gIf4J6CCalkbuXm/PRspopE8Yk2n6KYYIRCUMpX7kSWE1Y6uwoYJR31DQ/0wcoch++pLWbnY8VlQDpOS4EBBspdNcZtfIDQw61J58RtcdgxAfBLH55wRLJtH8TizCHYml4fcRmDcuGCIRIvcDy9g4QEIqZZSqaUtgdiZvr2gunqtOfOf6OrRbFRFMzsfGkjREKaFiA38C/hqtUMU0MDbrp2Lg1gqd/AhEMid/glepkZo62g8w6svf80pFZ/Y/TmINqeUXPzG1sL6V3BvWvbrGRgWFhbYszfcYVj92TiSn6VbzgYF+TFBxSE9IFnsFeZUzU6NB5j1q7x4G/EU9wkDYU7+sGdPRQ1CKnsPrCE3DiAoQxSG2LIxEhSwJVCAhFxqmQqnEBuF5Puu60Zy2yJ9w/YS9SCnulaY2bkfcRCJtbWlLWi53GnwWnVkUGDM9bdr5+pDIw4HF8EjBBBoZhAZuOgoIUUga6bhs+5qEN2pitRtpBXRsSBAS9cEgSgMGbavPpeUU97R+qObNm3aElQTy+QDAkQNwqT5dY0p/Q6+e/syyq0AQr2kI+SIpvUeyhAr+y650NJS2EkpUlDUq0mkWsq1jEK8vX3X7YT5U4LIKuHYmvhIiwjqsbxDHE63tFVoUq50GpwogBjaIRryi1pRZzmKhHNbyhEqvsCDQBghZbztsRat55rZs2d3WgOpPYEliyYQp0hns6XhQNrOYOgYhtQAZwCGo1Gsu6jft2nTkCGbNv2wZUcpm7j57diySRBSzXkEpYiD36BocBUCCGVOnmBUN2BRMXHIoLmrpkdCP7TUFgmLWooWCjh7qpjCIxW+gevI9/byJhTp6fYWteoOnSuwh8Bq1crG5UjIaYVCADGa385AlCAwIuxsXBEZbC0gYTgpkSse1G8YmQb4esANVKcIxOw1SRwf9QwEDShIT6TsJhBhtEmCKQekhvqz++OpF8jZX//DkCFIHT16TAaKIAoVlJAtr3eJAWYEArkytj/LEZx5/0/m0YAmW8XtOcMmNWf2QGytmt45OQy64bSBCe0pk1nKW8hBgralSlO1Uz21HHzy8wMCCIW6+1pbTflKhYTphNueH6IlEslpJ8ngErTq4LAdnYgFNSIuUJ7hxIEiI9Ef5RO6PdQrgSKjBBxGAMRqjk95GcR+FVTVbvVOGg0dx549xu07mhKVR3dA1VDPtln17tOnT8dpQLFiC6lKTnl+i9BkvJosZZQi3v3mnpAi+n8Sw6v6n/kEdmYegVjEkiVANBAI/EZrW2MdHQ2RTBM+QQmQqoZc6qnNnCKESBAHi7XUb9UKc8q1IyMgsdq1dRDLAcK1VUQWvjYUUgqOgRTSzhXSE61YKyt/0thXEBluenpwiG6zR/PclTUjYLPXoHAlvQSi+0Z8En14DosNhEZY7677ctUdcvzReoaB6ghbE986BF0HOQpXuqWZLqNJRRx89wtKEbc/AAmAqEGq3FOzp0bJxe2pqanx89tDLTpATHI0NDQMY3uMSKZbWrI1GuQ5qcgSJDy1jI/ke8MlLGoLOJpL2FtYZFHbrMyyj6DWy1lL7MBWBRP56JEjzbmSoR0GI25s3Nu6u0JmWdRCiJSwTpw5hMcGXOlsGnYABAlLJMsRAMEJINp0T4Ta2s1IOOo7BmaM28dWgcxTjjJ36N2TNhbpQlgAxYIhTf34+RWTm3MJzQFvdak8+M1XEIEfMBCXX1BRz8UU/GXVl5GIjbDkSZM6T0p2NJRqylJtJRLblraWUpGUSGifPn1azw0Js5sHNCU6CIv09AiL9NFsMYNyAUggBNra2EXMhfOa84nIE/ZWQotG/ShJUfQdgkO4QWai86heM7vb291GeEBQKE8x52jDgqR798OHaZjLRzESPQMDaSPi/vi8+NyzQlSwXTQmEpmEOo9ejAT1Gnzeir0LOuq/svhn0v6d9QeFyLj9wQcfMGUZExcX51fjF+eXg5rjB9uDUhKz6svpkZ1pW1HkZvxLgzGRSB0cSILI+i1DjpiGBvju9PfYjl8YnW5hNXy4k5O/BQuPErWgcBCazyyK45FIFPaDaX7lRBjmJlKn4p/g7W6q50MOka7klelwCICg6pnYabYAgtpQ+uzw7ngajxCJsRm0heC9OfVEQR0Vhk2yScZ6ciLhxxYHV9Din8krDjGGIiOW574iELfRe3EVZz45U+H3yZkzcfT5vEWZe/zy4qoyF39JG4umr1wMQYF0IawziiAnLKUKqdgSBbRv374kJsgfVBs8du5cl5BgBxLVLFEQibY+zs7hyAZOEXNHjx7JtIS9fUREBNVbeI5yO+Pg4kMZghyCK6id3a3bcIBAESphDvEMxPLlyw8fpiEF+QTtKuo67r33hg0bNk6NAe7w/HbrsmnVD6Qyeb8VW6e9kiTUDnGL4y8TB9hlLueD/p+g94qtYCDmZaMj5biqzKpFq76ELf44Pjp3ZSRcwkRTnioV2bbUJq3taWykVzhj3bqdHh5Rag7raDGQljyfkWjlSj2FD60HWw2m8S4sK2vu3KzqtfQz1elox4lDuJ6b4BDchtrZINFt9hpEyeqBI2ifAJWSeHw66L33lu/eTwlwwuHdbFfRuHFMbTdheFErSBgJBAfbI/AqCAkcYurBWd8gBm7dfhcGEhVCEUWp6e+HhhQg9pDEjOH8Mj9evHjxxxOjeb+P4RKGuqLUlqliW0iL06etjUxpJ+bObZ+eGk3DD3DwDaCF4XxvIlFAJArYXtxwwSeoTx8sTDWZ3DAvybK38Bd2cIeHuzxzCIvZs/1nz/aYHc3zpwZ2YyBoxWfg24PYNpLdSUzO1+2es/w9GDiMFbbY/XZDoUSD1gA30Y6J0h9eCQ3ZgLfgELO+J4f47ot3GYnbt8EBNVcZEwcQKoBY5Mf5nTlTZY6+KzM7O7NKyTd8zFxCw9PW+nTLkJAlphcYhpkLD326mm5RWjriwtfNCLmRbr8TdRD8s41VWiih7YSF4cEjSxITR68tyJqLAkPLHa5tfcKdw13coTE3QEyl1xIJqAhExmhkzUGDXgBBwbB8t7AdNYVtsHqPQqQ3ODSzsEkLPkTi/PkfJv82WcoGIDCmfvT9F1CVXzWBQMIkDpwfpEQcgZg3L5arqPKLM+f42OzM7Ez4R27mYrgE9XphS27c6NuXTjQwDI2sRMR7eFBY5OtBQZ0+guRo558ezbIj1VAHufhIfr6Njbs7KqZVxGCKETbBoI0T5DCIHS/WdHDbazdsqIWtqcXzVuPiYW8TiKiBb3uNzTDN6Dpuzm5hy0xi426GYhxAGDa3H4TtLpu2dfIPxKGX4YtjW01wGDP1o1nfX+K5e999wUB8gXx5m9o11oCRuKrIy+M4moXnxHC83yLyDz4XnSgqx5JJk2703bx5Bu1HBYZDjWzin9jo0W2db0DokRBUVpH4tDMabyf/LNaDRbCeXK4dEpIf4gO/aNeOjbKs2PyflgHhQxQ5CIxqnltbW5vIrd2+wcICjYsyfeAgby9aG44XQGToCZvuBgokuLTGw7tZAQk01JA1u7GW9tnRbsOOL2vsZxwQGLFfAMQXQmR8cJnmELcFlWnevz8NgpR5fhXzFuXxcYto8wSfR60obUzdvHLlSjBYCArbVo9mo4iU95Emvd1C9Ry0UqHAkUfD831bObEimgj55O4sFXm2bNnSNpztLnO1QbqAprKx8W7r7KAlFpPWBocrtO+mlgjwykRzTnAIrwA1iAkD3+4aSuuOL5DgucSUOgjNsT0dm98hJNNlOy9pKfylrsuk/VuMA7QUBQazb25/cA9BrrrFNAVAoHxWqOIqstFwoPmIy17Exvw8lwsSK1FIkTwPwQ6oF17M47cdWrhz3TpvU2MHyAv0IBCczjS/99/AYiPCztUZUsySRr+2uPuQ1jbt2rm6u+fnH3GAGBGG3MP9N6CPoKFf7YbRwlUiQwzyonVzGloRCBpZaAkk1NHBYDTM6fry+sbLpxDYKaiXD0EhUY5ZTxzwK28xDt99991X96hNuvzBbZYtbsfQuhfKxic05K+qqKqCoBA24DZkAgGziQca4tOEpZ+01dsOHZo5oy/SQ8hpaE25RAIULVseoYRJlWMtCW0HqUSCfjWVvirWcggPyW/r4kIbRRS0zqdFypOllOpaC39/f49aVnESZ1MHYmrqxqZ3fNoIgKDdCdYCidXqVhcK43dA0O5sXdou81JlNRES5VfmlCCYfXXvMjVol2998827Fy9e7oHqcAAAC9hJREFUXLr0c9qdR015Tk5ObKy56tmKmaohc+LEibkNDX5RadHq15AT33joEJ19KjQ1DcF1eUpaSC2lMhn6sZD8fF87q4iCtRtIU4Wfpi3ZbOeQpkKEJBIeDlin2WZlmdQBGcV/AzgU0FpHwvDhHh4FiRO2z+6W4O1maqRHW2kmEIhBAaY08pcTCdSOukR4Y1Ld/v1oy3s6/s6RAJnsN9viSVIiMG4xf/jui69uMQooml8Bw8GDlZWV4y8u/dzv1Q0Q5nlxDSgeEzNzn31NmRO1mk490cpPYSGNG0lcpCpaSOS06VrkiVZsnZN/RIQ/68YRLc9fqUwhklp6Wqo38Qt7dxEX6Nj8E0iQ0WoHWyhHA2JsbGwaMAg5gksaOMiNNjnKFHJrI6atDzfupzHuHDryZPhXDjjJGAgWF/CEWCWjcPmeGsOyfv36LSMSFTVxMTExl2k+g/7Dr2ZPRVX2qlUfk8CsiuVV0TkTolJyAeEQLfwAQ6ip0WlrkUREu69t5XRMDyjo8tgmSyTF/COnxS8ehtLUFD5e2MTcymqt+RV/aG3Xtm3dArx8ExLY1gnaRGJthNgYkVQ3cJCXevsvkTAldT1njqCnqCc3+CvHdgSPuGf+1XdM3HGxl26BghpDlylmU7r0Y07x3KAoVq2CzJ4+feVKdBwfV+VWTZzI8sRiWv4ChVA9o9NiXDqEHNuA7algKNCna0EkubIjkC/uXtb87ZlrTRG16U5WVv7DWwkaUy8ULAIC3OgMlZR2Crh5Q14ibzadGlHQRscM9VHAjAySlaK/dB5UyBGzZn3/xaXYS/duffXF99/PmnVQwGDWHmY2BU4xniWLpUu/pA+ySDrd0lk40vGxunTM3EzrPqZ6RkbWcjntPZTQHkpa0kmVazIUWrRdygcy4cXTtJrN7HcUoWpAdia0aidsVcbPoSUXzuGKKJcaIV/SLiO9Z+eIJLTRKNA0I8OUhrj6hnLRXzvhJaHqSSRg3xOEWR8dPDh12fox77zVvv0AE3Tx7eEUy5ZVjiebTh+wyM4nTybDJhGLzcIpl82bb9xYEuZobC3GZYo8pS0k7KUIu9HZcQQJ0sBpSEYHuhp2JkWiUEgtm8lpCrkD8x1XuIODWE5nNrQcHIzZAWt1IOiZhoayHUaKZ6fRaRewMV6AoY6OXPRXD2IzPbUeKD76aBY+Pjo4der69WMIw4ABEnXVNUOAdEG66Hey88l+/TqTNyR36TJlCh53BAxmffveuDFpSRheg4aujoaJiQGKk0JK9UuXSid6U0pdMlRKT09PLZp6S2m2RwtkqB0v3zxkTjkUlY+LCzpQunga+chps7dUJHl2yUZGRoBOVfDZrmUFnejHNyn+nfN+6DTeAgqwIGMQBGeQvVh1hTNRUy50MTNLXgJLnvIWGSHC/yclo9e4AQ8xZBtaoVQMTHRsNUw0dPAy0eZoX8CPaKPDkZnQYXe8WA31N+oYs7VjT4lw2EvEjC4aUeTAtnY70I53IiZnICipGtDczdDamm79y4f72Hs8/LtHxUECKN4ZwwwQGIWXV0ZlEtxhA10DDdvTugaGFy5cWHKyyzuCdYGbIE6W4K9+J8M0dNubmQEPcsuU5ClIMPpm7TXam3Whr3deou1Ir1tHePU6uBbIu7AlS0IuhF6wFinIDcSGWlpa1sIbFNBuEge24R3/0yI01sL+S7Uw1EezJ9wfs/a6Jn/LgU/JAGJBhgsYMOB1B0k1NTUtU01amNheuHByfOX69eQ9Y+BL6vxRuezkFJZb+3VRm/DJFIqrzpH/ioxcsuRCcliYoyO7CkfHsEDq1zIKC28UFl4wlMp1rI3DAnHdyIoZiH5rOnasZxoSamoaeoRt6TxCuVKqq2PoGBjIzqr16tWFxeyUPzyf9OffpcJkANnrt6yrkxgdt5G3XFJ599q3Dx49mjr10YOpUw8+uDt+fPmd+4+WvQWc/YrvfL3s62UPHi2rjCzH38gsDyor7xZfuvavyM5LlnR+9CgYKQXhNCn41/vXI6//Gty5sO/1G0aG1saBoU+fFmZkuP1adv36U+gF2n9zvezXAK/711GKjEKK8/VQPXUMw54+DQ6+9uDrjl93PFn5dWXxo6+7/MERjL/fLD1lLWT6BOLyuXvffvRR8aVZs26du3tw1t3iuxfXI67eWVb8bXnlwfvXrhXfXVp+7VzlsspHxeXld859/m0xq7g/K38piuxx/3pw8L+Kr04vOlFcFPzw1+JCU0fHwBv3b5YVz3h4/MS5x7/mmxojH7qVla3z9fYtvk47tNzKimkx1Disd3FZUdEv5/5VXn6x+G55+d1zd0FC958lIfG0bNFiQHLngz9+dXkWiu29e99/j8/enXXp2x+nMhBfX/v2xx8vXfrxx2snysu/vVReWX7nUnn51bjPT1wrJxBFccqfVxWV/VxUVPbLk6KiL8/hs/u/BuqFhWXcv3n8+Imy48dv4uMhrf/q5RcvPD5o0KCy62i0Qt2OFxc/BJHA4LJfiopWxZ778snSExfLy5/8fG78P09ClApF0L7f+I/uXiLp8e3lW7fuxX41a9blS7ceEIgxBOLd4nd//PEu/vr20tKL5XeuLV16NVblt2o6ucT0X36Ovfrkl6tFq07EXb1aVHT13Kqr9zPCkDFu4KqPPz6xECDogBAthP9a/PjxOgIREBrq5uV7M63sYUZGxkMCsfLnmnOrnvyylECcODH+6yn/NAk5tJHJW/2mqkHE3rt3iYG4fI1AvDNmqgCivPzdEwTic4C4A4/Ii4m5ChKR01eWrVp5buXPAJF3AjimF/1y4sS/2BLVr8XHBRCPz5WVPTU1JhDnbt4kEDdpBuFV9nggSDx8ePzmzeNFV3958nPelz8vLX9y9dKTn4srQcLgn32TI6mnhsmAt9Y/uEQa7NtbCI1Lsz6alXOLQuMdNYhzCI9vERp3TuCOXbtLofHkak7Zl0VoUMpWPrl6Lm9lUVHxz0/w/6Kic2XBYfqG1mGF5x4LYfG4jHY3o07AI9iAsuwx9LSX77mbj2+eu3n84fEyBqLoyS+qmKVPnpw4cedOcXFll7+tdPzpd3yxtIQuf1D8EfToNSTMuyfePfjRJfwXupyBoNz47Z37d9HDF1+6eOcamnkisvTSOWSHqydWwgtUm5EjiouKIiODi8r+FUjvCGEceP3c45snkCwf33xIzZXYWi8fbAjETV9KmY/RkPsWlw1iIB5fKioqOnGu6Mm1a+UoWo+Kx3dpb/DPgqD3fJkyZtn9+1PXs/J5985BfFZ8/wFAjPn64om7U5dVPrh/bfzX/fp9Pf7+/UeV+PfBiekXic+J6VdPoFfZfD2yc3Bk8f07nYODr5dNcjTU0NUwdMx4er+s78OMh9fLMqjJpGMx14tv/urldbPsJipqWYCbm1uGV/H1h9evP3x4/VowCs+d8sj7478me3QfIP7xNwAbYNZl/bIHy9YvYwZBCmH14AEcYv2d4juVeGAMZNUUJqWWMVkF/YkOBS98OikreouK5OSek54+nTSp8/2nYYYaBhIRvbOQYE+fBlrTUUo5msz8p/m4/AB04G7U2NKycKFbYWiG6YVJ+M4+7ECSoN76vbJz9J8wE2pQxuD3kyZn9s47TEU8egSF+U6TTDV7blPQk9zoHHmj86TkMH0zJrAdw2DJyWHCOyop1A0EkiS9cQudeaNzK3q0x5ve1wYKAn0HNVukrug9qQwFpW2GZxPeHULyz4PQNBnQntkAtQn/m3KysrLfyWThUfRbBgN02+vqDqD384Dv0zu3AAKaJOEBomFI72kjLFcLbweH5oq6aJl6xqD13KjnooaMfS5Gw6Krqz60aMCe0OD/AQdKFCZ0hpQdByczMYE+b5984UJycktDiaa6CWRvJ6c2TU3WuhmYND0iYS8fl/OswxNGFPRGV7JnDflzY+9+JVO3qAoFe2ZJU1Pw/9c7BGpot9RObmn756sYa5tlLf7PmaW2ti1ttf5vN4VtS2FS+19uklRtW0+p7L+eg8zSU67QbPHGZG8ovLE39sbe2Bt7Y2/sv9H+By3BqoBaYLjWAAAAAElFTkSuQmCC); background-size: cover; background-position: center; background-repeat: no-repeat; height: 80%; width: 80%;"></div>
    `;
  }
});

plugin.onConfig((tools) => {
	console.log(tools);
	return dom(
		"div",
		{},
		dom(
			"div",
			{},
			dom("p", {
				innerText: "Background Image URL/背景图片链接",
				style: { margin: "10px 8px" },
			}),
			dom("textarea", {
				value: plugin.getConfig("imageURL", ""),
				rows: 2,
				oninput: (event) => {
					plugin.setConfig("imageURL", event.target.value);
					update("imageURL", event.target.value);
          console.log(imageURL);
				},
				style: {
					width: "100%",
					background: "rgba(255, 255, 255, 0.07) padding-box",
					resize: "vertical",
					borderRadius: "0.5em",
					padding: "8px",
				},
			})
		)
	);
});
