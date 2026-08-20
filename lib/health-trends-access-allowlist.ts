/**
 * App-level access gate.
 *
 * For one specific organisation (pmEntityId 1006639) the entire Health Trends
 * app is restricted to an explicit email allowlist: only those users see the
 * app; everyone else from that org sees a "feature coming soon" screen. Users
 * from ANY OTHER pmEntityId are unrestricted and always see the full app.
 *
 * The email is matched against the profile API's `employee_email`
 * (case-insensitive, whitespace-trimmed).
 */

/** The single organisation that is gated by the email allowlist below. */
export const RESTRICTED_PM_ENTITY_ID = "1006639"

/**
 * Emails allowed to access the app within the restricted org. Populated from
 * the client-provided list. Keep all entries lowercase.
 */
const RESTRICTED_ORG_ALLOWED_EMAILS: string[] = [
  "pradip.pradhan@tcs.com",
  "srini.t@tcs.com",
  "captgirish.s@tcs.com",
  "rajasree.r@tcs.com",
  "shekhar.kamble@tcs.com",
  "srikanth.surampudi@tcs.com",
  "prerna.agarwal@tcs.com",
  "simmi.mahra@tcs.com",
  "santosh.salvi@tcs.com",
  "rohiniprashant.jadhav@tcs.com",
  "shikha1.j@tcs.com",
  "mahesh1.chavan@tcs.com",
  "pundlik.bhave@tcs.com",
  "ratheesh1.nambiar@tcs.com",
  "ravi.banjan@tcs.com",
  "pratiksha.kasbekar@tcs.com",
  "shiladitya.ghosh@tcs.com",
  "hema.saliyan@tcs.com",
  "anil.semwal@tcs.com",
  "mamta.chandnani@tcs.com",
  "dilshad.kanga@tcs.com",
  "homiar.vaghchhipawala@tcs.com",
  "nimesh.varma@tcs.com",
  "santosh.mudaliar@tcs.com",
  "alfred.nazareth@tcs.com",
  "shraddha.maheshwari@tcs.com",
  "garima.gupta@tcs.com",
  "madhu.yelma@tcs.com",
  "s.misra@tcs.com",
  "ujjwala.singh@tcs.com",
  "patrick.morenas@tcs.com",
  "saara.i@tcs.com",
  "suchitra.ayer@tcs.com",
  "neha16.a@tcs.com",
  "rupalee.shinde@tcs.com",
  "sheeja.manoj@tcs.com",
  "trupti.salvi@tcs.com",
  "na.srivastava@tcs.com",
  "nigel.chacko@tcs.com",
  "shashikant.amdoskar@tcs.com",
  "rahul1.gaikwad@tcs.com",
  "shabnam.shaikh@tcs.com",
  "shoukath.alism@tcs.com",
  "abhay.awasthi@tcs.com",
  "daya.u@tcs.com",
  "dinesh.mudaliar@tcs.com",
  "g.srini@tcs.com",
  "soumen3.m@tcs.com",
  "asha.nair@tcs.com",
  "niroopa.paulson@tcs.com",
  "rajendra.takavale@tcs.com",
  "hariharan.mohanan@tcs.com",
  "shijithkumar.a@tcs.com",
  "phoenix.thomas@tcs.com",
  "shubhangi.joshi@tcs.com",
  "chatterjee.indira@tcs.com",
  "thirunavukkarasu.sivakumar@tcs.com",
  "mangala.mishra@tcs.com",
  "bijay.mohanty@tcs.com",
  "omkar.warang@tcs.com",
  "b.yogesh@tcs.com",
  "dineshkumar.sd@tcs.com",
  "pushpanjali.sahu@tcs.com",
  "sajid.c@tcs.com",
  "amit.prakash@tcs.com",
  "kartik.suru@tcs.com",
  "nilesh.gandhi@tcs.com",
  "pratap.ekka@tcs.com",
  "sekar.sankaran@tcs.com",
  "mitra.ambarjit@tcs.com",
  "sushma.poojary@tcs.com",
  "kulkarni.sandeep3@tcs.com",
  "menon.anoop@tcs.com",
  "d.nath@tcs.com",
  "abhishek.bhriguvanshi@tcs.com",
  "amit31.p@tcs.com",
  "anil.harne@tcs.com",
  "mukesh.kuttanur@tcs.com",
  "m.dayasagar@tcs.com",
  "pravin.joseph@tcs.com",
  "shwetha.bn1@tcs.com",
  "anirudh.menon@tcs.com",
  "niyaz.1@tcs.com",
  "prasad.pendse@tcs.com",
  "abhishek.tandon@tcs.com",
  "manju.nair2@tcs.com",
  "preethiba.m@tcs.com",
  "sandip.mohapatra@tcs.com",
  "koustav.chandra@tcs.com",
  "doel.b@tcs.com",
  "jaise.j@tcs.com",
  "j.ahamed@tcs.com",
  "subramanyam1.v@tcs.com",
  "nidhi.syeole@tcs.com",
  "sunita.kunder@tcs.com",
  "sunita.c1@tcs.com",
  "anil.gonsalves@tcs.com",
  "prashant.tawate1@tcs.com",
  "ramesh.bellan@tcs.com",
  "keerthana.saravanan@tcs.com",
  "shama.cheekoly@tcs.com",
  "vijay.temkar@tcs.com",
  "ravindra.kashive@tcs.com",
  "shilpa.kj@tcs.com",
  "yerri.b@tcs.com",
  "haripriya.manoharan@tcs.com",
  "suganth.infin@tcs.com",
  "d.mane@tcs.com",
  "kiran.khan@tcs.com",
  "leena.nambiar@tcs.com",
  "skj.sk@tcs.com",
  "abhinibesh.sinha@tcs.com",
  "vaishnavi.majumder@tcs.com",
  "varsini.m@tcs.com",
  "karthik.krishnan3@tcs.com",
  "k.krishnamoorthy1@tcs.com",
  "sivaprasad.m10@tcs.com",
  "sandeeprajan.r@tcs.com",
  "ravi.rajkumar@tcs.com",
  "snehal.kajne@tcs.com",
  "harisankar.31@tcs.com",
  "sudhishkumar.s@tcs.com",
  "premsagar.parimi@tcs.com",
  "mukesh.kumar18@tcs.com",
  "ravichandra.35@tcs.com",
  "subhasmita.dash1@tcs.com",
  "sc.kishanth1@tcs.com",
  "anuja.dixit1@tcs.com",
  "aksa.saji@tcs.com",
  "sshrutika.rawat@tcs.com",
  "mirium.swarnap@tcs.com",
  "pragati.sen@tcs.com",
  "meiyammai.rm@tcs.com",
  "k.oviya@tcs.com",
  "m.rashidkh@tcs.com",
  "sham.pandit@tcs.com",
  "puja.ranjan@tcs.com",
  "abdul.6@tcs.com",
]

/**
 * Normalize an email for comparison. This is intentionally defensive because
 * the profile API value may arrive with surrounding whitespace, mixed case,
 * zero-width/invisible unicode characters, or wrapped as a display name
 * ("Full Name <user@tcs.com>"). We strip invisible characters, extract the
 * actual address token when present, then trim + lowercase.
 */
function normalizeEmail(email: string | null | undefined): string {
  if (!email) return ""
  // Remove zero-width and BOM characters that can sneak in from copy/paste
  // or upstream systems and silently break an otherwise-correct match.
  let value = String(email).replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
  // If wrapped like "Name <user@tcs.com>", pull out the address inside <>.
  const angle = value.match(/<([^>]+)>/)
  if (angle) value = angle[1].trim()
  // Otherwise, extract the first email-looking token if there is extra text.
  const token = value.match(/[^\s<>,;"']+@[^\s<>,;"']+/)
  if (token) value = token[0]
  return value.trim().toLowerCase()
}

const allowedEmailSet = new Set(RESTRICTED_ORG_ALLOWED_EMAILS.map((e) => normalizeEmail(e)))

/**
 * Whether the current user may access the full app.
 *
 * - Any pmEntityId other than RESTRICTED_PM_ENTITY_ID => always allowed.
 * - RESTRICTED_PM_ENTITY_ID => allowed only if the email is on the allowlist.
 */
export function isAppAccessAllowed(pmEntityId: string | number | null | undefined, email: string | null | undefined): boolean {
  const pm = String(pmEntityId ?? "").trim()
  if (pm !== RESTRICTED_PM_ENTITY_ID) {
    return true
  }
  return allowedEmailSet.has(normalizeEmail(email))
}
