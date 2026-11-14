"""Apply Google Play release signing to the generated Android project. Run after every `npx expo prebuild`.

The upload key and its passwords never live in this repo: they're read from ~/.gradle/gradle.properties
(DASIG_UPLOAD_STORE_FILE, DASIG_UPLOAD_KEY_ALIAS, DASIG_UPLOAD_STORE_PASSWORD, DASIG_UPLOAD_KEY_PASSWORD).
Without them, release builds stay signed with the debug key, as before.
"""
import pathlib, re
p = pathlib.Path(__file__).resolve().parent.parent / "android/app/build.gradle"
s = p.read_text()
if "DASIG_UPLOAD_STORE_FILE" not in s:
    s = s.replace("    signingConfigs {\n", """    signingConfigs {
        release {
            if (project.hasProperty('DASIG_UPLOAD_STORE_FILE')) {
                storeFile file(DASIG_UPLOAD_STORE_FILE)
                storePassword DASIG_UPLOAD_STORE_PASSWORD
                keyAlias DASIG_UPLOAD_KEY_ALIAS
                keyPassword DASIG_UPLOAD_KEY_PASSWORD
            }
        }
""", 1)
    s = re.sub(r"(release \{\n(?:(?!\n        \}).)*?)signingConfig signingConfigs\.debug",
               r"\1signingConfig project.hasProperty('DASIG_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug", s, count=1, flags=re.S)
    p.write_text(s)
print("release signing:", "upload key" if "signingConfigs.release : signingConfigs.debug" in s else "NOT APPLIED")
