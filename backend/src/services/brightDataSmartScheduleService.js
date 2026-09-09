const SMART_TIME_ZONE = "America/New_York";

const HOURLY_GROUPS = [
  {
    label: "NYC high freshness housing",
    url: "https://www.facebook.com/groups/nycroom/",
    group_id: "787001561415032",
    num_of_posts: 10,
    cadence: "hourly",
  },
  {
    label: "NYC apartments for rent",
    url: "https://www.facebook.com/groups/1651982041751861/",
    group_id: "1651982041751861",
    num_of_posts: 10,
    cadence: "hourly",
  },
  {
    label: "NYC rooms for rent",
    url: "https://www.facebook.com/groups/I9150/",
    group_id: "149460102285472",
    num_of_posts: 10,
    cadence: "hourly",
  },
];

const ROTATING_GROUPS = [
  {
    label: "NYC roommates and sublets",
    url: "https://www.facebook.com/groups/362585282654583/",
    group_id: "362585282654583",
    num_of_posts: 5,
    cadence: "every 4 hours",
  },
  {
    label: "NY house roommates apartments",
    url: "https://www.facebook.com/groups/2205128056327933/",
    group_id: "2205128056327933",
    num_of_posts: 5,
    cadence: "every 4 hours",
  },
  {
    label: "NYC housing rooms apartments sublets",
    url: "https://www.facebook.com/groups/1225966920763001/",
    group_id: "1225966920763001",
    num_of_posts: 5,
    cadence: "every 4 hours",
  },
  {
    label: "NYC sublets apartments",
    url: "https://www.facebook.com/groups/nycsublets/",
    group_id: "984974681565250",
    num_of_posts: 5,
    cadence: "every 4 hours",
  },
];

function getScheduleParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SMART_TIME_ZONE,
    hour: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || now.getUTCHours());
  const weekday = parts.find((part) => part.type === "weekday")?.value || "";

  return {
    hour,
    weekday,
    rotationIndex: hour % ROTATING_GROUPS.length,
  };
}

function toBatch(group, reason) {
  return {
    label: group.label,
    reason,
    cadence: group.cadence,
    groups: [
      {
        url: group.url,
        num_of_posts: group.num_of_posts,
      },
    ],
  };
}

function buildSchedule(now = new Date()) {
  const schedule = getScheduleParts(now);
  const rotatingGroup = ROTATING_GROUPS[schedule.rotationIndex];

  return {
    timezone: SMART_TIME_ZONE,
    hour: schedule.hour,
    weekday: schedule.weekday,
    batches: [
      ...HOURLY_GROUPS.map((group) =>
        toBatch(group, "fresh group: low overlap in the Sep 8 snapshot review")
      ),
      toBatch(rotatingGroup, "rotating group: higher overlap, so check fewer posts less often"),
    ],
  };
}

module.exports = {
  buildSchedule,
};
