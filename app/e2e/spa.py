import http.server, os, sys
os.chdir(sys.argv[1])
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        p=self.translate_path(self.path.split('?')[0])
        if not os.path.isfile(p): self.path='/index.html'
        return super().do_GET()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(("",int(sys.argv[2])),H).serve_forever()
