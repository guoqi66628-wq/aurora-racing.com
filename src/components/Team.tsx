import { motion } from "motion/react";
import { useState } from "react";

interface TeamMember {
  name: string;
  image: string;
  subgroup?: string;
  isLeader?: boolean;
  roleTitle?: string;
}

interface TeamGroup {
  name: string;
  enName: string;
  members: TeamMember[];
}

export default function Team() {
  const [activeMember, setActiveMember] = useState<string | null>(null);

  const teamGroups: TeamGroup[] = [
    {
      name: "管理�?,
      enName: "Management",
      members: [
        { name: "许德�?, roleTitle: "队长", image: "/images/team/temp.webp" },
        { name: "马晓�?, roleTitle: "底盘总监", image: "/images/team/temp.webp" },
        { name: "陈君�?, roleTitle: "车身总监", image: "/images/team/temp.webp" },
        { name: "冯俞�?, roleTitle: "电气总监", image: "/images/team/temp.webp" },
        { name: "郭祺", roleTitle: "运营总监", image: "/images/team/temp.webp" },
        { name: "霍文�?, roleTitle: "车队经理", image: "/images/team/temp.webp" },
        { name: "李浩�?, roleTitle: "运动部长", image: "/images/team/temp.webp" },
      ]
    },
    {
      name: "运营�?,
      enName: "Operations",
      members: [
        { name: "张城�?, roleTitle: "商业组组�?, image: "/images/team/temp.webp" },
        { name: "陶劲�?, roleTitle: "运营组组�?, image: "/images/team/temp.webp" },
      ]
    },
    {
      name: "底盘�?,
      enName: "Mechanic",
      members: [
        { name: "姜鸿�?, subgroup: "悬架转向�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "郭家�?, subgroup: "悬架转向�?, image: "/images/team/temp.webp" },
        { name: "陈冰", subgroup: "悬架转向�?, image: "/images/team/temp.webp" },
        { name: "邹梓�?, subgroup: "悬架转向�?, image: "/images/team/temp.webp" },
        { name: "邱国�?, subgroup: "悬架转向�?, image: "/images/team/temp.webp" },
        { name: "杨杰�?, subgroup: "传动�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "肖维", subgroup: "传动�?, image: "/images/team/temp.webp" },
        { name: "何博�?, subgroup: "传动�?, image: "/images/team/temp.webp" },
        { name: "彭绍�?, subgroup: "制动�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "邓济�?, subgroup: "制动�?, image: "/images/team/temp.webp" },
        { name: "胡铭�?, subgroup: "动力学算法组", isLeader: true, image: "/images/team/temp.webp" },
        { name: "江泽�?, subgroup: "动力学算法组", image: "/images/team/temp.webp" },
      ]
    },
    {
      name: "车身�?,
      enName: "Aerodynamics & Body",
      members: [
        { name: "王振�?, subgroup: "单体壳组", isLeader: true, image: "/images/team/temp.webp" },
        { name: "刘沂�?, subgroup: "单体壳组", image: "/images/team/temp.webp" },
        { name: "彭成�?, subgroup: "空套�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "杨贯�?, subgroup: "空套�?, image: "/images/team/temp.webp" },
        { name: "徐瀚文", subgroup: "空套�?, image: "/images/team/temp.webp" },
        { name: "黎梓�?, subgroup: "空套�?, image: "/images/team/temp.webp" },
        { name: "汤帅", subgroup: "冷却�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "劳乔�?, subgroup: "冷却�?, image: "/images/team/temp.webp" },
      ]
    },
    {
      name: "电气�?,
      enName: "Electronics",
      members: [
        { name: "黄熙�?, subgroup: "电池�?, isLeader: true, image: "/images/team/temp.webp" },
        { name: "曾潮�?, subgroup: "电池�?, image: "/images/team/temp.webp" },
        { name: "陈天�?, subgroup: "电池�?, image: "/images/team/temp.webp" },
        { name: "杨辉�?, subgroup: "电池�?, image: "/images/team/temp.webp" },
        { name: "李魏朝阳", subgroup: "电子系统�?, image: "/images/team/temp.webp" },
        { name: "连梓�?, subgroup: "电子系统�?, image: "/images/team/temp.webp" },
        { name: "邱贤�?, subgroup: "电机�?, isLeader: true, image: "/images/team/temp.webp" },
      ]
    }
  ];

  return (
    <section id="team" className="w-full relative bg-white overflow-hidden pt-12 pb-28 md:py-24 pl-4 pr-4 md:pl-20 md:pr-20">
      {/* Removed background grid and glow for a cleaner white background */}

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-32">
          <h2 className="font-display text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter">
            MEET THE <span className="text-[#7928CA]">TEAM-2026</span>
          </h2>
          <div className="w-24 h-1 bg-[#7928CA] mx-auto mt-4"></div>
        </div>

        {/* Groups */}
        <div className="flex flex-col gap-20">
          {teamGroups.map((group) => (
            <div key={group.enName} className="w-full">
              {/* Left-aligned Title */}
              <div className="flex flex-col items-start mb-10 border-b border-gray-100 pb-4">
                <h3 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-wide">
                  {group.name}
                </h3>
                <span className="font-mono text-sm text-[#7928CA] uppercase tracking-widest font-bold">
                  {group.enName}
                </span>
              </div>

              {/* Members Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 sm:gap-x-8 lg:gap-x-10 xl:gap-x-12 gap-y-20 md:gap-y-24">
                {group.members.map((member, idx) => {
                  const memberId = `${group.enName}-${member.name}-${idx}`;
                  const isActive = activeMember === memberId;

                  return (
                    <motion.div
                      key={memberId}
                      className="relative group w-full aspect-[3/4] cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: (idx % 10) * 0.05, duration: 0.5 }}
                      onClick={() => setActiveMember(isActive ? null : memberId)}
                    >
                      {/* The Back Card */}
                      <div
                        className={`absolute inset-0 translate-x-3 translate-y-3 md:translate-x-4 md:translate-y-4 bg-gray-300 rounded-2xl z-0 transition-all duration-300 ease-in-[cubic-bezier(0.175,0.885,0.32,1.275)]
                                      group-hover:translate-x-0 group-hover:translate-y-0 group-hover:-bottom-16 group-hover:-left-2 group-hover:-right-2 group-hover:-top-2
                                      group-hover:bg-white group-hover:shadow-2xl
                                      flex flex-col justify-end p-4 shadow-xl border border-black/5
                                      ${
                                        isActive
                                          ? "translate-x-0 translate-y-0 -bottom-16 -left-2 -right-2 -top-2 bg-white shadow-2xl"
                                          : ""
                                      }`}
                      >
                        <div
                          className={`transition-opacity duration-300 delay-100 transform
                                        ${
                                          isActive
                                            ? "opacity-100 translate-y-0"
                                            : "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                                        }`}
                        >
                          <p className="text-gray-600 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1.5 truncate">
                            {group.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-950 font-bold text-sm truncate">
                              {member.roleTitle ||
                                (member.isLeader && member.subgroup
                                  ? `${member.subgroup}组长`
                                  : member.subgroup || "队员")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* The Front Card */}
                      <div
                        className={`absolute inset-0 z-10 rounded-2xl overflow-hidden transition-all duration-300 ease-in-[cubic-bezier(0.175,0.885,0.32,1.275)]
                                      group-hover:-translate-y-4 group-hover:-translate-x-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] bg-gray-100 border border-black/5
                                      ${isActive ? "-translate-y-4 -translate-x-2 shadow-[0_20px_40px_rgba(0,0,0,0.3)]" : ""}`}
                      >
                        <img
                          src={member.image}
                          alt={member.name}
                          className={`w-full h-full object-cover transition-transform duration-500 ease-out ${
                            isActive ? "scale-105" : "group-hover:scale-105"
                          }`}
                          referrerPolicy="no-referrer"
                        />

                        {/* Name Overlay always visible */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end">
                          <p className="text-white font-bold text-lg md:text-xl leading-tight w-full drop-shadow-md">
                            {member.name}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
