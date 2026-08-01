#!/usr/bin/env python3
"""
Panameer I image tree  →  a match plan for the Learn catalog
(brief_learn_thumbnail_import WS1/WS2).

    python3 scripts/learn_thumbnails.py <catalog.json> <plan.json> [--verbose]

READS ONLY. It resolves which local image belongs to which catalog row and
writes a plan; nothing is uploaded and no row is touched here. Separating the
match from the write is the whole safety story — the same rule the bulk-URL
loader follows, and the reason the Archive-Scott join was killed: a wrong image
silently attached is worse than no image, because a wrong one looks finished.

WHAT THE SOURCE TREE ACTUALLY IS
--------------------------------
The brief describes `Audience / LP / Lesson / 1. Docs`. The real tree is
VARIABLE DEPTH — images sit 1 to 8 segments below the root, because some paths
insert a course level and some insert two. Matching on a fixed depth would find
69 lesson folders out of 522 catalog lessons.

So the rule here is structural rather than positional: **a folder that contains
a `Docs` subfolder IS a lesson folder**, wherever it sits. That is what the
authoring convention actually guarantees, and it survives a reorganisation that
a hard-coded depth would not.

The XLS has no path column despite the brief's wording — its header group is
"Structure (Matching Panameer...)", meaning the Course Type / Learning Path /
Lesson columns ARE the folder names. So the normalized-name match the brief
lists as the fallback is in fact the only route, and is what runs.
"""
import json
import os
import difflib
import re
import sys
import unicodedata

SRC = (
    "/Users/scottwalls/Library/CloudStorage/OneDrive-Panameer/Panameer I/"
    "1. Content Creators/2. Panameer.com/1. Learn"
)

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")

# "1. Docs", "Docs", "docs" — the marker that its parent is a lesson.
DOCS_RE = re.compile(r"^\d*\.?\s*docs?$", re.I)

# thumbnail / thumbnails / Thumbnail / thmubnails / "sourcing Thumbnail" …
# Deliberately loose around the vowels: the typos in this tree are transpositions
# ("thmubnails"), and a strict spelling would drop the files it was written for.
THUMB_RE = re.compile(r"th[a-z]{0,3}mb", re.I)

AUDIENCE_FOLDER = {
    "BEGINNERS": ["beginners"],
    "END_USER": ["end-users", "end users", "endusers"],
    "IMPLEMENTER": ["implementers"],
    "CONTENT_CREATOR": ["content creator training", "content creators"],
}


def norm(s):
    """
    Fold a folder or title to a comparable key.

    Strips leading numbering ("1. ", "01 - "), accents, punctuation and case,
    and collapses whitespace. Deliberately NOT stemming or fuzzy: this decides
    which picture goes on which lesson, and "close enough" is exactly the class
    of mistake the never-guess-attach rule exists to prevent.
    """
    if not s:
        return ""
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("\xa0", " ")
    # Leading numbering, on both sides of the match: folders use "6. ", the
    # catalog uses "2.5 - ". Multi-level and any of . ) - as the separator.
    s = re.sub(r"^\s*\d+(?:\.\d+)*\s*[.)\-\u2013\u2014]*\s*", "", s)
    s = s.lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# Abbreviations the two sources genuinely disagree on. Kept SHORT and explicit:
# every entry here is a place a human wrote the same thing two ways, and a long
# list would start inventing equivalences rather than recording them.
SYNONYMS = [
    (r"\bversus\b", "vs"),
    (r"\bmulti tenancy\b", "multi tenant"),
    (r"\bnumber\b", "no"),
    # The authoring tree abbreviates where the catalog spells out.
    (r"\bmgt\b", "management"),
    (r"\bmgmt\b", "management"),
    (r"\bexectn\b", "execution"),
    (r"\bexec\b", "execution"),
    (r"\bconfig\b", "configure"),
    (r"\bfa\b", "functional area"),
]

# Structural suffixes the folder tree adds and the catalog doesn't: the folder
# "1. Contract Mgt LP" is the catalog's "Contract Management", and "1.
# Procurement Group" is its group. Stripped so the anchor compares the NAME.
SHELL_SUFFIX = re.compile(r"\s+(lp|group|learning path)$")


def canon(s, strip_shell=False):
    """
    norm() plus the known spelling disagreements folded together.

    `strip_shell` also drops a trailing "LP" / "Group" / "Learning Path", which
    only ever appears on the folder side. Off by default so a catalog title that
    genuinely ends in one of those words isn't quietly truncated.
    """
    s = norm(s)
    for pat, rep in SYNONYMS:
        s = re.sub(pat, rep, s)
    s = re.sub(r"\s+", " ", s).strip()
    if strip_shell:
        prev = None
        while prev != s:
            prev = s
            s = SHELL_SUFFIX.sub("", s).strip()
    return s


def similarity(a, b):
    """
    How alike two normalized titles are, 0..1.

    difflib on the whole string, plus a token-containment bonus for the very
    common case where one side carries extra leading words the other drops
    ("An Overview of Oracle Cloud Users" vs "Oracle Cloud Users"). Containment
    alone is NOT enough to accept a match — it would happily pair "What is OTBI"
    with "What is OTBI Dashboards" — so it only raises the score, and the margin
    test below is what actually decides.
    """
    if not a or not b:
        return 0.0
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    ta, tb = set(a.split()), set(b.split())
    if ta and tb and (ta <= tb or tb <= ta):
        # One title's words are a subset of the other's ("Oracle Cloud Users" in
        # "An Overview of Oracle Cloud Users"). Worth something, but CAPPED
        # BELOW the accept bar: the source leaves here are short and generic
        # ("online", "catalogs", "course overview"), and containment alone
        # cheerfully paired "online" with "How to Create a Purchase Order using
        # the Online..." at 0.90. Containment can only ever help a match that
        # the path context has already made plausible.
        cover = len(ta & tb) / max(len(ta | tb), 1)
        ratio = max(ratio, min(0.88, 0.60 + 0.28 * cover))
    return ratio


STEP_RE = re.compile(r"^step\s+(\d+)\b", re.I)


def step_no(s):
    """
    The "Step 6" ordinal, when a title carries one.

    Both sides of this import use it — the folder says "Step 6 - Sign
    Digitally" and the catalog says "Step 6 - How Parties Digitally Sign a
    Contract Document in Oracle Cloud". Those are the same lesson written twice,
    and they only score 0.69 as strings. The number is an EXACT key where the
    prose is not, so where both sides have one it is trusted ahead of any
    similarity score.
    """
    m = STEP_RE.match(norm(s))
    return int(m.group(1)) if m else None


def images_in(d):
    try:
        return sorted(
            f for f in os.listdir(d)
            if f.lower().endswith(IMG_EXT) and not f.startswith(".")
        )
    except OSError:
        return []


def subdirs(d):
    try:
        return sorted(
            f for f in os.listdir(d)
            if not f.startswith(".") and os.path.isdir(os.path.join(d, f))
        )
    except OSError:
        return []


def pick_thumbnail(docs_dir):
    """
    The image to use from a lesson's Docs folder.

    Preference order, and each step is a decision:
      1. a `~thumb*` name — the authored thumbnail, typos included;
      2. otherwise the single remaining content image — unambiguous;
      3. otherwise NOTHING. Several unnamed candidates is exactly the ambiguity
         the brief says to report rather than resolve by picking the first
         alphabetically.
    """
    imgs = images_in(docs_dir)
    if not imgs:
        return None, "no images in Docs"

    thumbs = [f for f in imgs if THUMB_RE.search(f)]
    if len(thumbs) == 1:
        return thumbs[0], "thumb-named"
    if len(thumbs) > 1:
        # Prefer the plainest name — "thumbnail.jpg" over "thumbnail potential.jpg".
        thumbs.sort(key=lambda f: (len(f), f.lower()))
        return thumbs[0], f"thumb-named ({len(thumbs)} candidates, shortest)"

    if len(imgs) == 1:
        return imgs[0], "single content image"
    return None, f"ambiguous ({len(imgs)} images, none thumb-named)"


def scan_source():
    """
    Walk the tree once and index everything by normalized path segments.

    Returns (lessons, folders):
      lessons — key: tuple of normalized segments below the audience folder,
                value: {"dir", "rel", "image", "why"}
      folders — every folder that holds an image DIRECTLY (LP covers, course art)
    """
    lessons = {}
    folders = {}
    unreadable = []

    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        rel = os.path.relpath(root, SRC)
        if rel == ".":
            continue
        segs = rel.split(os.sep)

        # A folder holding an image directly — candidate LP cover / course art.
        direct = [f for f in files
                  if f.lower().endswith(IMG_EXT) and not f.startswith(".")]
        if direct:
            key = tuple(norm(s) for s in segs)
            # Prefer a thumb-named file, else the only one; never guess between many.
            thumbs = [f for f in direct if THUMB_RE.search(f)]
            chosen = None
            if len(thumbs) == 1:
                chosen = thumbs[0]
            elif len(direct) == 1:
                chosen = direct[0]
            elif thumbs:
                thumbs.sort(key=lambda f: (len(f), f.lower()))
                chosen = thumbs[0]
            if chosen:
                folders[key] = {
                    "dir": root,
                    "rel": rel,
                    "image": chosen,
                    "path": os.path.join(root, chosen),
                }

        # A folder containing a Docs subfolder IS a lesson folder.
        docs = [d for d in dirs if DOCS_RE.match(d.strip())]
        if docs:
            docs_dir = os.path.join(root, sorted(docs)[0])
            image, why = pick_thumbnail(docs_dir)
            key = tuple(norm(s) for s in segs)
            entry = {
                "dir": root,
                "rel": rel,
                "docs": docs_dir,
                "image": image,
                "why": why,
                "path": os.path.join(docs_dir, image) if image else None,
            }
            lessons[key] = entry
            if image:
                full = entry["path"]
                try:
                    if os.path.getsize(full) == 0:
                        unreadable.append(full)
                except OSError:
                    unreadable.append(full)

    return lessons, folders, unreadable


def audience_keys(audience):
    return [norm(x) for x in AUDIENCE_FOLDER.get(audience, [])]


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    catalog_path, plan_path = sys.argv[1], sys.argv[2]
    verbose = "--verbose" in sys.argv

    if not os.path.isdir(SRC):
        sys.exit(f"Source not found (is OneDrive connected?): {SRC}")

    catalog = json.load(open(catalog_path))
    lessons_idx, folders_idx, unreadable = scan_source()

    if unreadable:
        print("STOP — unreadable / 0-byte files (OneDrive placeholders?):")
        for u in unreadable[:20]:
            print("   ", u)
        sys.exit(1)

    print(f"source: {len(lessons_idx)} lesson folders, {len(folders_idx)} folders with a direct image\n")

    plan = {"lessons": [], "paths": [], "courses": [], "sections": []}
    stats = {"matched": 0, "ambiguous": 0, "unmatched": 0, "no_image": 0}
    unmatched = []

    # ---- candidate pools -------------------------------------------------
    # Depth is unreliable, so a lesson folder is identified by the audience it
    # sits under plus its own folder name, with the LP segment used to
    # disambiguate. Pools are scoped as tightly as the tree allows: matching
    # across the whole catalog would let "Course Overview" in one path claim the
    # thumbnail of "Course Overview" in another, of which there are many.
    pool_by_aud = {}
    for key, entry in lessons_idx.items():
        if len(key) < 2:
            continue
        entry["name_key"] = key[-1]
        entry["segs"] = key
        pool_by_aud.setdefault(key[0], []).append(entry)

    # Accept a fuzzy pairing only when it is BOTH very close and clearly the
    # best available. The margin is what stops "What is OTBI?" taking the
    # "What is OTBI Dashboards" folder when its own is present: near-ties are
    # reported, never resolved by picking the higher float.
    ACCEPT = 0.90
    MARGIN = 0.05

    claimed = {}          # source image -> the lesson title that won it
    proposals = []
    catalog_lessons = []  # flattened, with the context each match needs
    source_unplaced = []  # source images we could NOT place, and why

    for lp in catalog:
        auds = audience_keys(lp["audience"])
        lp_key = canon(lp["title"])

        # ---- LP cover: an image sitting directly in the LP folder ----------
        # The LP cover is the image sitting DIRECTLY in the LP folder. Matched
        # on the shell-stripped name with a similarity floor, because the tree
        # writes "4. Login & Get Started" where the catalog says "4. How to
        # Login & Get Started" — exact equality found 3 of the 4 available and
        # silently dropped the fourth.
        cover, cover_score = None, 0.0
        contained = []
        for aud in auds:
            for fkey, hit in folders_idx.items():
                if len(fkey) != 2 or fkey[0] != aud:
                    continue
                name = canon(fkey[1], strip_shell=True)
                sc = 1.0 if name == lp_key else similarity(name, lp_key)
                if sc >= 0.86 and sc > cover_score:
                    cover, cover_score = hit, sc
                # "Login & Get Started" against "How to Login & Get Started"
                # scores 0.857 — a hair under the bar, on nothing but string
                # length. Word containment plus uniqueness within the audience
                # settles it properly, which is the same discipline the lesson
                # tiers use: evidence, then uniqueness, never a nudged threshold.
                elif set(name.split()) and set(name.split()) <= set(lp_key.split()):
                    contained.append(hit)
        if cover is None and len(contained) == 1:
            cover, cover_score = contained[0], 0.85
        if cover:
            plan["paths"].append({
                "id": lp["id"], "title": lp["title"],
                "file": cover["path"], "rel": cover["rel"] + "/" + cover["image"],
                "score": round(cover_score, 3),
                "had": bool(lp["cover_image"]),
            })

        for course in lp["courses"]:
            c_key = canon(course["title"])
            for aud in auds:
                # A course's own art: a folder whose LAST segment names the
                # course and which holds an image directly. Depth is not fixed,
                # so the LP has to appear somewhere in the path and the leaf has
                # to name the course.
                hit = next(
                    (h for fkey, h in folders_idx.items()
                     if len(fkey) >= 3 and fkey[0] == aud
                     and any(canon(x, strip_shell=True) == lp_key for x in fkey[1:-1])
                     and similarity(canon(fkey[-1], strip_shell=True), c_key) >= 0.90),
                    None,
                )
                if hit:
                    plan["courses"].append({
                        "id": course["id"], "title": course["title"],
                        "file": hit["path"], "rel": hit["rel"] + "/" + hit["image"],
                        "had": bool(course["thumbnail_url"]),
                    })
                    break

            for section in course["sections"]:
                s_key = canon(section["title"])
                for aud in auds:
                    hit = next(
                        (h for fkey, h in folders_idx.items()
                         if len(fkey) == 4 and fkey[0] == aud
                         and canon(fkey[1]) == lp_key and canon(fkey[3]) == s_key),
                        None,
                    )
                    if hit:
                        plan["sections"].append({
                            "id": section["id"], "title": section["title"],
                            "file": hit["path"], "rel": hit["rel"] + "/" + hit["image"],
                            "had": bool(section["thumbnail_url"]),
                        })
                        break

                for lesson in section["lessons"]:
                    catalog_lessons.append({
                        "lesson": lesson, "lp": lp, "course": course,
                        "section": section,
                        "lp_key": lp_key, "course_key": c_key, "section_key": s_key,
                        "title_key": canon(lesson["title"]),
                        "auds": auds,
                    })

    # ---- place each SOURCE image on a catalog lesson ------------------------
    # Driven from the source, because that is what there is a finite supply of:
    # 88 lesson folders hold an image, against 522 catalog lessons. Iterating
    # the catalog would report 434 "misses" that are not misses at all — the art
    # simply hasn't been made yet — and would bury the real question, which is
    # whether each image that DOES exist found its home.
    for key, entry in lessons_idx.items():
        if not entry["image"]:
            continue
        aud_folder = key[0]
        segs = [canon(x) for x in entry["segs"]]
        leaf = canon(entry["name_key"])

        pool = [c for c in catalog_lessons if aud_folder in c["auds"]]
        if not pool:
            source_unplaced.append({
                "rel": entry["rel"], "reason": f"audience folder '{aud_folder}' has no catalog paths"
            })
            continue

        # HARD REQUIREMENT: the learning path must match. Everything below the
        # LP in this tree is short and generic, so without this anchor
        # "Course Overview" in one path would happily take another path's art.
        # The LP anchor. Compared against shell-stripped segments because the
        # tree writes "1. Contract Mgt LP" where the catalog says "Contract
        # Management". This is a FILTER, not the match — the leaf still has to
        # clear ACCEPT and MARGIN below, so a loose anchor widens the candidate
        # pool without ever, on its own, attaching an image.
        shell = [canon(x, strip_shell=True) for x in entry["segs"]]
        scoped = [c for c in pool if c["lp_key"] in segs or c["lp_key"] in shell]
        if not scoped:
            scoped = [c for c in pool
                      if any(similarity(c["lp_key"], sg) >= 0.86 for sg in shell)]
        if not scoped:
            source_unplaced.append({
                "rel": entry["rel"],
                "reason": "no catalog learning path matches this folder's path",
            })
            continue

        # Narrow again on the course segment when the tree carries one — this is
        # what separates five different "Course Overview" folders.
        # Course narrowing, by CONTAINMENT rather than equality: the tree writes
        # "6. Catalogs" where the catalog says "How to Use the Catalogs
        # Application". Equality found nothing, which left the scope at whole-LP
        # width and let four different courses' "Course Overview" folders all
        # match one lesson. Narrowing is what makes the weaker tiers safe, so it
        # has to actually work.
        def seg_matches(course_key):
            ck = set(course_key.split())
            for sg in shell:
                if not sg:
                    continue
                sw = set(sg.split())
                if sg == course_key or (sw and sw < ck) or similarity(sg, course_key) >= 0.86:
                    return True
            return False

        by_course = [c for c in scoped if seg_matches(c["course_key"])]
        narrowed_by_course = bool(by_course)
        search = by_course or scoped

        # Narrow once more on the section, when the tree names one. Every extra
        # segment that matches shrinks the pool, and a small pool is what makes
        # the weaker tiers below safe.
        by_section = [c for c in search
                      if c["section_key"] in segs or c["section_key"] in shell]
        narrowed_by_section = bool(by_section)
        if by_section:
            search = by_section

        hit, tier, score = None, None, 0.0

        # TIER 1 — the same title, once folded. Nothing to argue about.
        exact = [c for c in search if c["title_key"] == leaf]
        if len(exact) == 1:
            hit, tier, score = exact[0], "exact", 1.0

        # TIER 2 — the Step ordinal. An exact key on both sides; trusted over
        # prose similarity, which scores these pairs around 0.6.
        if hit is None:
            n = step_no(entry["name_key"])
            if n is not None:
                steps = [c for c in search if step_no(c["lesson"]["title"]) == n]
                if len(steps) == 1:
                    hit, tier, score = steps[0], f"step {n}", 0.99

        # TIER 3 — very close prose, and clearly closer than the runner-up.
        if hit is None:
            scored = sorted(
                ((similarity(leaf, c["title_key"]), c) for c in search),
                key=lambda x: -x[0],
            )
            best, cand = scored[0]
            second = scored[1][0] if len(scored) > 1 else 0.0
            if best >= ACCEPT and best - second >= MARGIN:
                hit, tier, score = cand, f"similar {best:.2f}", best

        # TIER 4 — every word of the folder name appears in exactly ONE catalog
        # title in this scope. "1. DocuSign" inside "Introducing DocuSign";
        # "Find a Contract" inside "How to Find a Contract in Oracle Cloud".
        # Uniqueness is doing the work here, not the string distance — if two
        # lessons in scope contain the words, this tier declines and the image
        # is reported instead.
        # Requires a scope narrowed past the whole LP. At LP width "Course
        # Overview" is contained in exactly one lesson somewhere in the path and
        # this tier would attach it — which is how four unrelated courses all
        # claimed one "Generic Course Overview". Containment is only evidence
        # once the path context has already done its job.
        if hit is None and leaf and (narrowed_by_course or narrowed_by_section):
            words = set(leaf.split())
            if words:
                subs = [c for c in search if words <= set(c["title_key"].split())]
                if len(subs) == 1:
                    hit, tier, score = subs[0], "contained, unique in scope", 0.85

        if hit is None:
            scored = sorted(
                ((similarity(leaf, c["title_key"]), c) for c in search),
                key=lambda x: -x[0],
            )
            best = scored[0][0] if scored else 0.0
            source_unplaced.append({
                "rel": entry["rel"],
                "reason": f"no confident catalog lesson (best {best:.2f}, {len(search)} in scope)",
                "closest": scored[0][1]["lesson"]["title"] if scored and best > 0.5 else None,
            })
            continue

        proposals.append({
            "score": score, "tier": tier, "entry": entry, "lesson": hit["lesson"],
            "lp": hit["lp"]["title"], "course": hit["course"]["title"],
        })

    # ---- one folder, one lesson -------------------------------------------
    # Two lessons can legitimately score above the bar against the same folder
    # (near-duplicate titles across courses). The higher score keeps it; the
    # other is REPORTED, not quietly given a picture of something else.
    # A LESSON gets at most one image, and a tie attaches NOTHING. Four source
    # folders once scored identically against a single "Generic Course Overview"
    # — with no way to tell which was meant, picking any of them would have been
    # three wrong pictures presented as finished work.
    by_target = {}
    for prop in proposals:
        by_target.setdefault(prop["lesson"]["id"], []).append(prop)
    contested = []
    for lid, props in by_target.items():
        if len(props) == 1:
            continue
        props.sort(key=lambda p: -p["score"])
        if props[0]["score"] - props[1]["score"] < 0.02:
            for p2 in props:
                source_unplaced.append({
                    "rel": p2["entry"]["rel"],
                    "reason": f"{len(props)} images tie for one lesson "
                              f"({props[0]['score']:.2f}); none attached",
                    "candidates": [x["entry"]["rel"] for x in props[:4]],
                })
                contested.append(id(p2))
        else:
            for p2 in props[1:]:
                source_unplaced.append({
                    "rel": p2["entry"]["rel"],
                    "reason": f"another image scored higher for \"{p2['lesson']['title']}\"",
                })
                contested.append(id(p2))
    proposals = [p2 for p2 in proposals if id(p2) not in contested]

    proposals.sort(key=lambda p: -p["score"])
    for prop in proposals:
        f = prop["entry"]["path"]
        if f in claimed:
            stats["ambiguous"] += 1
            unmatched.append({
                "reason": f"folder already claimed by a closer title ({claimed[f]})",
                "lp": prop["lp"], "lesson": prop["lesson"]["title"],
                "folder": prop["entry"]["rel"],
            })
            continue
        claimed[f] = prop["lesson"]["title"]
        stats["matched"] += 1
        plan["lessons"].append({
            "id": prop["lesson"]["id"], "title": prop["lesson"]["title"],
            "file": f,
            "rel": os.path.relpath(f, SRC),
            "why": prop["entry"]["why"],
            "score": round(prop["score"], 3),
            "tier": prop["tier"],
            "had": bool(prop["lesson"]["thumbnail_url"]),
        })

    source_with_image = sum(1 for e in lessons_idx.values() if e["image"])
    placed = len(plan["lessons"])

    print("LESSON THUMBNAILS  (measured against the images that EXIST,")
    print("                    not against all 522 catalog lessons)")
    print(f"  source lesson folders            {len(lessons_idx):4d}")
    print(f"    of those, holding an image     {source_with_image:4d}   <- the real ceiling")
    print(f"    placed on a catalog lesson     {placed:4d}"
          f"   ({100.0 * placed / max(source_with_image, 1):.0f}% of available art)")
    print(f"    could not be placed            {len(source_unplaced):4d}")

    from collections import Counter
    reasons = Counter(re.sub(r"\(.*\)", "(…)", u["reason"]) for u in source_unplaced)
    if reasons:
        print("\n  why images went unplaced:")
        for r, n in reasons.most_common(8):
            print(f"    {n:4d}  {r}")

    print(f"\nLP covers  {len(plan['paths'])}")
    print(f"courses    {len(plan['courses'])}")
    print(f"sections   {len(plan['sections'])}")

    plan["unmatched"] = source_unplaced
    plan["stats"] = {
        "sourceLessonFolders": len(lessons_idx),
        "sourceWithImage": source_with_image,
        "placed": placed,
        "unplaced": len(source_unplaced),
    }
    json.dump(plan, open(plan_path, "w"), indent=1)
    print(f"\nplan → {plan_path}")


if __name__ == "__main__":
    main()
