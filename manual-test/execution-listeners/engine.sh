# Shell helper for testing the engine's execution listeners by hand over its REST API.
#
#   source manual-test/execution-listeners/engine.sh
#
# It defines one command, `zl`, so that nothing of your shell is shadowed. Every subcommand prints
# the request it sends and the status the engine answers, so what you see is the REST API itself.
# Needs bash, curl and python3; python3 only formats the answers, and keeps the 64-bit keys exact.
#
# Sourcing it also reads seeded-instances.md beside it, which the seeding script writes: the keys
# of the seeded instances become shell variables named after their scenarios (U2, ..., T1, ...)
# and ORDER_DEFINITION, and ENGINE becomes the engine which was seeded (http://localhost:8080 where nothing was seeded yet). An
# ENGINE set before sourcing is kept. ZL_HOME names the directory of this file, for the models.
# Source it again after every seeding run.
#
#   zl api METHOD PATH [JSON]             any request below /v1, e.g. zl api GET /jobs/123
#   zl deploy FILE                        deploys a BPMN file
#   zl start PROCESS_ID [VARIABLES]       starts an instance of the latest definition with that id
#   zl newest PROCESS_ID                  the key of the newest instance of that process
#   zl state INSTANCE                     state, variables and active elements of an instance
#   zl variables INSTANCE                 the variables of an instance
#   zl jobs INSTANCE                      the jobs of an instance as a table, oldest first
#   zl job INSTANCE TYPE                  the newest job of that type, whole
#   zl input INSTANCE TYPE                the input variables and task headers of that job
#   zl complete INSTANCE TYPE [VARIABLES] completes that job
#   zl fail INSTANCE TYPE [BODY]          fails that job; BODY is the request body
#   zl history INSTANCE                   the elements the instance entered, with their inputs and outputs
#   zl incidents INSTANCE                 the incidents of an instance
#   zl resolve INSTANCE [BODY]            resolves the open incident of an instance
#   zl cancel INSTANCE                    cancels an instance
#   zl children INSTANCE                  the instances a sub-process or call activity of the instance started
#   zl child INSTANCE subprocess|callActivity   the key of the newest such instance, e.g. SUB=$(zl child $U13 subprocess)
#
# Examples:
#   zl complete $T2 listener-demo-reserve '{"reserved": true}'
#   zl fail $T2 listener-demo-reserve '{"errorCode": "SHIPPING_FAILED"}'

if [ -z "${BASH_VERSION-}" ]; then
  echo "engine.sh needs bash: start bash, and source it there."
  return 1 2>/dev/null || exit 1
fi

ZL_HOME=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

zl() {
  if [ $# -eq 0 ] || ! declare -F "_zl_$1" >/dev/null; then
    echo "usage: zl api|deploy|start|newest|state|variables|jobs|job|input|complete|fail|history|incidents|resolve|cancel|children|child ..."
    echo "see the head of engine.sh for the arguments"
    return 2
  fi
  local subcommand=$1
  shift
  "_zl_$subcommand" "$@"
}

_zl_python() { python3 -c "$1" "${@:2}"; }

# The body of a GET, for the subcommands which format it themselves.
_zl_get() { curl -s "$ENGINE/v1$1"; }

# Sends the request and prints "METHOD /v1/path [body] -> status" and the body. Returns 0 for 2xx.
_zl_api() {
  local method=$1 path=$2 body=${3-} answer status text
  if [ -n "$body" ]; then
    answer=$(curl -s -X "$method" -H 'Content-Type: application/json' -d "$body" -w '\n%{http_code}' "$ENGINE/v1$path")
  else
    answer=$(curl -s -X "$method" -w '\n%{http_code}' "$ENGINE/v1$path")
  fi
  status=${answer##*$'\n'}
  text=${answer%$'\n'*}
  echo "$method /v1$path${body:+ $body} -> $status"
  if [ -n "$text" ]; then
    printf '%s' "$text" | python3 -m json.tool 2>/dev/null || printf '%s\n' "$text"
  fi
  [ "${status:0:1}" = 2 ]
}

_zl_deploy() {
  local answer
  answer=$(curl -s -X POST -H 'Content-Type: application/octet-stream' --data-binary "@$1" -w '\n%{http_code}' "$ENGINE/v1/process-definitions")
  echo "POST /v1/process-definitions ($(basename "$1")) -> ${answer##*$'\n'}"
  printf '%s' "${answer%$'\n'*}" | python3 -m json.tool 2>/dev/null || printf '%s\n' "${answer%$'\n'*}"
}

_zl_start() {
  local variables=${2-}
  [ -n "$variables" ] || variables='{}'
  _zl_api POST /process-instances "{\"bpmnProcessId\": \"$1\", \"variables\": $variables}"
}

_zl_newest() {
  _zl_get "/process-instances?bpmnProcessId=$1&sortBy=createdAt&sortOrder=desc&page=1&size=1" | _zl_python '
import json, sys
page = json.load(sys.stdin)
items = [instance for partition in page.get("partitions", []) for instance in partition.get("items", [])]
if not items:
    sys.exit("no instance of the process %s" % sys.argv[1])
print(max(items, key=lambda instance: instance["createdAt"])["key"])' "$1"
}

_zl_state() {
  echo "GET /v1/process-instances/$1"
  _zl_get "/process-instances/$1" | _zl_python '
import json, sys
instance = json.load(sys.stdin)
if "state" not in instance:
    sys.exit(json.dumps(instance))
print("state:    ", instance["state"])
print("variables:", json.dumps(instance.get("variables", {}), sort_keys=True))
print("active:   ", ", ".join(element["elementId"] for element in instance.get("activeElementInstances") or []) or "-")'
}

_zl_variables() {
  echo "GET /v1/process-instances/$1 (variables)"
  _zl_get "/process-instances/$1" | _zl_python '
import json, sys
print(json.dumps(json.load(sys.stdin).get("variables", {}), indent=2, sort_keys=True))'
}

_zl_jobs() {
  echo "GET /v1/process-instances/$1/jobs"
  _zl_get "/process-instances/$1/jobs?page=1&size=100" | _zl_python '
import json, sys
items = sorted(json.load(sys.stdin).get("items", []), key=lambda job: job["key"])
rows = [("key", "type", "elementId", "elementType", "listenerEventType", "state", "retries")]
rows += [(str(job["key"]), job["type"], job["elementId"], job["elementType"], job.get("listenerEventType", "-"),
          job["state"], str(job.get("retries", "-"))) for job in items]
widths = [max(len(row[column]) for row in rows) for column in range(len(rows[0]))]
for row in rows:
    print("  ".join(cell.ljust(width) for cell, width in zip(row, widths)).rstrip())
print(len(items), "job(s)")'
}

# Prints the newest job of the type in the instance: whole, its key, or its input.
_zl_job_of() {
  _zl_get "/process-instances/$1/jobs?page=1&size=100" | _zl_python '
import json, sys
jobs = [job for job in json.load(sys.stdin).get("items", []) if job["type"] == sys.argv[1]]
if not jobs:
    sys.exit("no job of the type %s in this instance" % sys.argv[1])
job = max(jobs, key=lambda job: job["key"])
if sys.argv[2] == "key":
    print(job["key"])
elif sys.argv[2] == "input":
    print("inputVariables:", json.dumps(job.get("inputVariables", {}), sort_keys=True))
    print("taskHeaders:   ", json.dumps(job.get("taskHeaders", {}), sort_keys=True))
else:
    print(json.dumps(job, indent=2))' "$2" "${3:-whole}"
}

_zl_job() {
  echo "GET /v1/process-instances/$1/jobs (the job $2)"
  _zl_job_of "$1" "$2"
}

_zl_input() {
  echo "GET /v1/process-instances/$1/jobs (the job $2)"
  _zl_job_of "$1" "$2" input
}

_zl_complete() {
  local key variables=${3-}
  key=$(_zl_job_of "$1" "$2" key) || return 1
  [ -n "$variables" ] || variables='{}'
  _zl_api POST "/jobs/$key/complete" "{\"variables\": $variables}"
}

_zl_fail() {
  local key body=${3-}
  key=$(_zl_job_of "$1" "$2" key) || return 1
  [ -n "$body" ] || body='{"message": "failed by hand"}'
  _zl_api POST "/jobs/$key/fail" "$body"
}

_zl_history() {
  echo "GET /v1/process-instances/$1/history"
  _zl_get "/process-instances/$1/history?page=1&size=100" | _zl_python '
import json, sys
items = sorted(json.load(sys.stdin).get("items", []), key=lambda element: element["key"])
for element in items:
    print("%-18s %-26s %s" % (element["elementId"], element["elementType"],
                              "completed" if element.get("completedAt") else "ACTIVE"))
    if element["elementType"] != "SEQUENCE_FLOW":
        print("    in:  %s" % json.dumps(element.get("inputVariables") or {}, sort_keys=True))
        print("    out: %s" % json.dumps(element.get("outputVariables") or {}, sort_keys=True))
print(len(items), "element(s)")'
}

_zl_incidents() {
  echo "GET /v1/process-instances/$1/incidents"
  _zl_get "/process-instances/$1/incidents?page=1&size=100" | _zl_python '
import json, sys
items = sorted(json.load(sys.stdin).get("items", []), key=lambda incident: incident["key"])
for incident in items:
    print("incident %s on %s, job %s, %s" % (incident["key"], incident["elementId"], incident.get("jobKey", "-"),
                                            "resolved" if incident.get("resolvedAt") else "OPEN"))
    print("    %s" % incident["message"])
print(len(items), "incident(s)")'
}

_zl_resolve() {
  local key
  key=$(_zl_get "/process-instances/$1/incidents?page=1&size=100" | _zl_python '
import json, sys
open_ones = [incident for incident in json.load(sys.stdin).get("items", []) if not incident.get("resolvedAt")]
print(max(open_ones, key=lambda incident: incident["key"])["key"] if open_ones else "")')
  if [ -z "$key" ]; then
    echo "the instance $1 has no open incident"
    return 1
  fi
  _zl_api POST "/incidents/$key/resolve" "${2-}"
}

_zl_cancel() { _zl_api POST "/process-instances/$1/cancel"; }

_zl_children() {
  echo "GET /v1/process-instances/$1/child-processes"
  _zl_get "/process-instances/$1/child-processes?page=1&size=100" | _zl_python '
import json, sys
page = json.load(sys.stdin)
items = [child for partition in page.get("partitions", []) for child in partition.get("items", [])]
for child in sorted(items, key=lambda child: child["key"]):
    print("%s  %-12s  %-24s  %s" % (child["key"], child["processType"], child.get("bpmnProcessId", ""), child["state"]))
print(len(items), "child instance(s)")'
}


_zl_child() {
  _zl_get "/process-instances/$1/child-processes?page=1&size=100" | _zl_python '
import json, sys
page = json.load(sys.stdin)
keys = [child["key"] for partition in page.get("partitions", []) for child in partition.get("items", [])
        if child["processType"] == sys.argv[1]]
if not keys:
    sys.exit("the instance has no child of the type %s (yet)" % sys.argv[1])
print(max(keys))' "$2"
}

# Takes the engine and the instances of the last seeding run from seeded-instances.md. The file
# holds them as lines like "T1=2121952512155062272"; nothing else of it is read, and nothing of it
# is executed.
_zl_load_seeded() {
  local file=$ZL_HOME/seeded-instances.md line seeded_engine='' names=''
  if [ -f "$file" ]; then
    while IFS= read -r line; do
      if [[ $line =~ ^([A-Z][A-Z0-9_]*)=([0-9]+)$ ]]; then
        printf -v "${BASH_REMATCH[1]}" '%s' "${BASH_REMATCH[2]}"
        names+=" ${BASH_REMATCH[1]}"
      elif [[ $line =~ ^(export\ )?ENGINE=(http[^[:space:]]+)$ ]]; then
        seeded_engine=${BASH_REMATCH[2]}
      fi
    done < "$file"
  fi
  # an ENGINE this file set at an earlier sourcing follows the seeding run; one set by hand stays
  if [ -z "${ENGINE-}" ] || [ "${ENGINE-}" = "${_ZL_ENGINE_SET_HERE-}" ]; then
    ENGINE=${seeded_engine:-http://localhost:8080}
    _ZL_ENGINE_SET_HERE=$ENGINE
  fi
  echo "engine:    $ENGINE"
  if [ -z "$names" ]; then
    echo "instances: none yet. Run seed_execution_listener_scenarios.py beside engine.sh, then source engine.sh again."
    return
  fi
  echo "instances:$names"
  echo "           read from $file"
  if [ -n "$seeded_engine" ] && [ "$seeded_engine" != "$ENGINE" ]; then
    echo "           WARNING: they were seeded on $seeded_engine, not on $ENGINE. Run 'unset ENGINE' and source engine.sh again to use that engine."
  fi
}
_zl_load_seeded
