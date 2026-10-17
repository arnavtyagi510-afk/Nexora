/* NEXORA job data (Step 1.2). DATA ONLY: no rendering or filtering logic lives here.

   Every listing below is a fictional DEMO sample. None is live, verified, or accepting applications.

   Schema (null = not known; never guess a value):
     id            unique number
     title, company
     logo          image URL, or null to show the company's initial as a placeholder
     category      broad group: Technology | Design | Marketing | Business
     type          opportunity type: "Job" | "Internship"
     employmentType "Full-time" | "Part-time" | "Contract" | "Freelance" | null (unknown)
     mode          "Remote" | "Hybrid" | "On-site"
     location      city name, or "Remote"
     salary        null, or { min, max, currency, period } with numeric min/max (period e.g. "year", "month")
     experience    "Entry-level" | "Internship" | "Experienced" | null (unknown)
     skills        string array
     description   short text, or null
     postedDate    "YYYY-MM-DD", or null
     deadline      "YYYY-MM-DD", or null
     applyUrl      official application URL, or null (only when a real URL exists)
     status        "DEMO" | "UNVERIFIED" | "VERIFIED"  (VERIFIED needs evidenceUrl, otherwise it is downgraded)
     evidenceUrl   link proving verification, or null
     tags          optional search tags (the popular-search / category-card topics)

   Notes on how the current values were derived from the original Step 1 data:
     - category and tags classify the existing roles into the homepage's category cards.
     - experience is set only where the title says so ("Junior", "Intern", "(Entry)"); the
       Digital Marketing Associate title does not say, so it is null (shown as "Unknown").
     - employmentType, salary, description, postedDate, deadline and applyUrl were never
       provided, so they are null. */
window.NEXORA_DEMO = {
  opportunities: [
    { id: 1, company: "Fernhill Labs",    title: "Junior Frontend Developer",          logo: null, category: "Technology", type: "Job",        employmentType: null, mode: "Hybrid",  location: "Bengaluru", salary: null, experience: "Entry-level", skills: ["React", "JavaScript", "CSS"],                         description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["Software Development"] },
    { id: 2, company: "Quarry Analytics", title: "Data Analyst Intern",                logo: null, category: "Technology", type: "Internship", employmentType: null, mode: "Remote",  location: "Remote",    salary: null, experience: "Internship",  skills: ["SQL", "Excel", "Python"],                              description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["Data Science"] },
    { id: 3, company: "Marlow Studio",    title: "UI/UX Design Intern",                logo: null, category: "Design",     type: "Internship", employmentType: null, mode: "On-site", location: "Mumbai",    salary: null, experience: "Internship",  skills: ["Figma", "Prototyping", "User research"],               description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["UI/UX Design"] },
    { id: 4, company: "Tessera Systems",  title: "Machine Learning Associate (Entry)", logo: null, category: "Technology", type: "Job",        employmentType: null, mode: "Hybrid",  location: "Hyderabad", salary: null, experience: "Entry-level", skills: ["Python", "PyTorch", "Statistics"],                     description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["AI/ML", "AI & Machine Learning"] },
    { id: 5, company: "Oakline Media",    title: "Digital Marketing Associate",        logo: null, category: "Marketing",  type: "Job",        employmentType: null, mode: "On-site", location: "Delhi NCR", salary: null, experience: null,          skills: ["SEO", "Content", "Analytics"],                         description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["Marketing"] },
    { id: 6, company: "Ledgerline",       title: "Business Analyst Intern",            logo: null, category: "Business",   type: "Internship", employmentType: null, mode: "Remote",  location: "Remote",    salary: null, experience: "Internship",  skills: ["Excel", "Financial modelling", "Research"],            description: null, postedDate: null, deadline: null, applyUrl: null, status: "DEMO", evidenceUrl: null, tags: ["Business & Finance"] }
  ]
};
