from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404, HttpResponseNotAllowed, JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = 'ТываТранзит — админка'
admin.site.site_title = 'ТываТранзит'

ASSET_VERSION = '3'


def health_check(request):
    return JsonResponse({'status': 'ok'})


def serve_frontend_page(request, page='index'):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])
    if page == 'index':
        filename = 'index.html'
    else:
        filename = f'{page}.html'
    filepath = settings.FRONTEND_DIR / filename
    if not filepath.exists():
        raise Http404
    response = FileResponse(open(filepath, 'rb'), content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache, must-revalidate'
    return response


def serve_frontend_asset(request, path, document_root):
    response = serve(request, path, document_root=document_root)
    if path.endswith('.js') or path.endswith('.css'):
        response['Cache-Control'] = 'no-cache, must-revalidate'
    return response


urlpatterns = [
    path('health/', health_check),
    path('admin/', admin.site.urls),
    path('api/', include('transit.urls')),
    path('', serve_frontend_page, {'page': 'index'}),
    path('<str:page>.html', serve_frontend_page),
]

if settings.FRONTEND_DIR.exists():
    urlpatterns += [
        re_path(
            r'^css/(?P<path>.*)$',
            serve_frontend_asset,
            {'document_root': settings.FRONTEND_DIR / 'css'},
        ),
        re_path(
            r'^js/(?P<path>.*)$',
            serve_frontend_asset,
            {'document_root': settings.FRONTEND_DIR / 'js'},
        ),
        re_path(
            r'^images/(?P<path>.*)$',
            serve_frontend_asset,
            {'document_root': settings.FRONTEND_DIR / 'images'},
        ),
    ]
