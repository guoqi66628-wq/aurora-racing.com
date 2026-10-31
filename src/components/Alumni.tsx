import { getAssetUrl } from "../utils/cdn";
import { useState, useEffect } from "react";

interface AlumniMember {
  name: string;
  image: string;
  year?: string; // 退役年份
  role?: string; // 曾任职位
}

const TEAM_IMAGE_FALLBACK = getAssetUrl("/images/team/temp.webp");

interface AlumniProps {
  onBack?: () => void;
}

export default function Alumni(_props: AlumniProps) {
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 767px)");

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };

    handler(mq);

    const changeHandler = (event: MediaQueryListEvent) => handler(event);

    if (mq.addEventListener) mq.addEventListener("change", changeHandler);
    else mq.addListener(changeHandler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", changeHandler);
      else mq.removeListener(changeHandler);
    };
  }, []);

  // When switching to desktop, clear any active (clicked) member so cards don't stay stuck
  useEffect(() => {
    if (!isMobile) setActiveMember(null);
  }, [isMobile]);

  const alumniMembers: AlumniMember[] = [
    // 精神领袖
    { name: "庞智贤", image: getAssetUrl("/images/Alumni/pangzhixian.webp"), year: "很多赛季", role: "精神领袖" },

    // 25赛季
    { name: "戴泓堃", image: getAssetUrl("/images/Alumni/daihongkun.webp"), year: "2025", role: "车队队长" },
    { name: "游铭轩", image: getAssetUrl("/images/Alumni/youmingxuan.webp"), year: "2025", role: "车身总监" },
    { name: "李嘉俊", image: getAssetUrl("/images/Alumni/lijiajun.webp"), year: "2025", role: "电气总监" },
    { name: "黄鸣方", image: getAssetUrl("/images/Alumni/huangmingfang.webp"), year: "2025", role: "机械总监" },
    { name: "卢子洋", image: getAssetUrl("/images/Alumni/luziyang.webp"), year: "2025", role: "空套组" },
    { name: "谢峰儒", image: getAssetUrl("/images/Alumni/xiefengru.webp"), year: "2025", role: "车手" },

    // 24赛季
    { name: "谢梓溥", image: getAssetUrl("/images/Alumni/xiezipu.webp"), year: "2024", role: "车队队长" },
    { name: "刘杨", image: getAssetUrl("/images/Alumni/liuyang.webp"), year: "2024", role: "空套组" },
    { name: "杨意", image: getAssetUrl("/images/Alumni/yangyi.webp"), year: "2024", role: "传动组" },
    { name: "郭嘉锴", image: getAssetUrl("/images/Alumni/guojiakai.webp"), year: "2024", role: "悬架转向组" },
    { name: "李桌", image: getAssetUrl("/images/Alumni/lizhuo.webp"), year: "2024", role: "电控组" },
    { name: "曾炜峰", image: getAssetUrl("/images/Alumni/zengweifeng.webp"), year: "2024", role: "制动组" },
    { name: "梁誉骞", image: getAssetUrl("/images/Alumni/liangyuqian.webp"), year: "2024", role: "电控组" },
    { name: "何毅", image: getAssetUrl("/images/Alumni/heyi.webp"), year: "2024", role: "传动组" },
    { name: "丁赛斐", image: getAssetUrl("/images/Alumni/dingsaifei.webp"), year: "2024", role: "传动组" },
    { name: "钟怡婧", image: getAssetUrl("/images/Alumni/zhongyijing.webp"), year: "2024", role: "低压组" },
    { name: "蔡东艇", image: getAssetUrl("/images/Alumni/caidongting.webp"), year: "2024", role: "电子系统组" },

    // 23赛季
    { name: "吴浩", image: getAssetUrl("/images/Alumni/wuhao.webp"), year: "2023", role: "传动组" },
  ];

  return (
    <section
      id="alumni"
      className="w-full relative bg-white pt-12 pb-28 md:py-24 pl-4 pr-4 md:pl-20 md:pr-20"
    >
      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-32">
          <h2 className="font-display text-4xl md:text-5xl font-black text-[#6722C1] uppercase tracking-tighter break-words">
            ALUMNI <span className="text-2xl md:text-3xl">PARTIAL</span>
          </h2>
          <div className="w-24 h-1 bg-[#6722C1] mx-auto mt-4"></div>
        </div>

        {/* Alumni Grid - No grouping, just all members in one grid */}
        {alumniMembers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">退役队员信息即将添加...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 sm:gap-x-8 lg:gap-x-10 xl:gap-x-12 gap-y-20 md:gap-y-24">
            {alumniMembers.map((member, idx) => {
              const memberId = `alumni-${member.name}-${idx}`;
              const isActive = activeMember === memberId;

              return (
                <div
                  key={memberId}
                  className="relative group w-full aspect-[3/4] cursor-pointer"
                  onClick={() => {
                    if (!isMobile) return;
                    setActiveMember(isActive ? null : memberId);
                  }}
                >
                  {/* The Back Card */}
                  <div
                    className={`absolute inset-0 translate-x-3 translate-y-3 md:translate-x-4 md:translate-y-4 bg-gray-300 rounded-2xl z-0 transition-all duration-200 ease-in-[cubic-bezier(0.175,0.885,0.32,1.275)]
                                  group-hover:translate-x-0 group-hover:translate-y-0 group-hover:-bottom-16 group-hover:-left-2 group-hover:-right-2 group-hover:-top-2
                                  group-hover:bg-white group-hover:shadow-2xl
                                  flex flex-col justify-end p-4 shadow-xl border border-black/5
                                  ${
                                    isActive
                                      ? "translate-x-0 translate-y-0 -bottom-16 -left-2 -right-2 -top-2 bg-white shadow-2xl"
                                      : ""
                                  }`}
                    style={{ willChange: "transform", backfaceVisibility: "hidden" }}
                  >
                    <div
                      className={`transition-opacity duration-300 delay-100 transform
                                    ${
                                      isActive
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                    }`}
                    >
                      {member.year && (
                        <p className="text-gray-600 text-[10px] md:text-xs font-bold uppercase tracking-tight mb-1.5 truncate">
                          {member.year.includes('赛季') ? member.year : `${member.year} 赛季`}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-950 font-bold text-sm truncate">
                          {member.role || "队员"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* The Front Card */}
                  <div
                    className={`absolute inset-0 z-10 rounded-2xl overflow-hidden transition-all duration-200 ease-in-[cubic-bezier(0.175,0.885,0.32,1.275)]
                                  group-hover:-translate-y-4 group-hover:-translate-x-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] bg-gray-100 border border-black/5
                                  ${isActive ? "-translate-y-4 -translate-x-2 shadow-[0_20px_40px_rgba(0,0,0,0.3)]" : ""}`}
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      width="300"
                      height="400"
                      decoding="async"
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
                        isActive ? "scale-105" : "group-hover:scale-105"
                      }`}
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        const img = event.currentTarget;
                        // Prevent infinite loop: only fallback once
                        if (img.dataset.fallback) return;
                        img.dataset.fallback = "1";
                        img.src = TEAM_IMAGE_FALLBACK;
                      }}
                    />

                    {/* Name Overlay always visible */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end">
                      <p className="text-white font-bold text-lg md:text-xl leading-tight w-full drop-shadow-md">
                        {member.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
