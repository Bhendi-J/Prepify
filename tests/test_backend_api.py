import io
import json
import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from webapp import app, db, bcrypt_
from webapp.models import User, Folder, StudyNote, FlashcardSet, QuizSet, QuizAttempt


class BackendApiTests(unittest.TestCase):
    def setUp(self):
        self.temp_db_dir = tempfile.mkdtemp(prefix='prepify-test-db-')
        self.temp_upload_dir = tempfile.mkdtemp(prefix='prepify-test-uploads-')
        self.temp_frontend_dir = tempfile.mkdtemp(prefix='prepify-test-frontend-')
        self.original_static_folder = app.static_folder

        os.makedirs(os.path.join(self.temp_frontend_dir, 'static'), exist_ok=True)
        with open(os.path.join(self.temp_frontend_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write('<!doctype html><html><body><div id="root">Prepify Test Shell</div></body></html>')
        with open(os.path.join(self.temp_frontend_dir, 'static', 'test.js'), 'w', encoding='utf-8') as f:
            f.write('console.log("prepify-test");')

        app.config.update({
            'TESTING': True,
            'WTF_CSRF_ENABLED': False,
            'SQLALCHEMY_DATABASE_URI': f"sqlite:///{os.path.join(self.temp_db_dir, 'test.db')}",
            'UPLOAD_FOLDER': self.temp_upload_dir,
            'SECRET_KEY': 'test-secret',
            'FRONTEND_BUILD_DIR': self.temp_frontend_dir,
            'FRONTEND_INDEX_PATH': os.path.join(self.temp_frontend_dir, 'index.html'),
        })
        app.static_folder = os.path.join(self.temp_frontend_dir, 'static')

        self.ctx = app.app_context()
        self.ctx.push()
        db.drop_all()
        db.create_all()
        self.client = app.test_client()

        hashed = bcrypt_.generate_password_hash('Password123!').decode('utf-8')
        self.user = User(username='tester', email='tester@example.com', password=hashed)
        db.session.add(self.user)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()
        self.ctx.pop()
        app.static_folder = self.original_static_folder
        shutil.rmtree(self.temp_db_dir, ignore_errors=True)
        shutil.rmtree(self.temp_upload_dir, ignore_errors=True)
        shutil.rmtree(self.temp_frontend_dir, ignore_errors=True)

    def _login(self):
        response = self.client.post('/api/login', json={
            'email': 'tester@example.com',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, 200)

    def test_upload_rejects_unsupported_extension(self):
        self._login()

        response = self.client.post(
            '/api/upload',
            data={
                'note_file': (io.BytesIO(b'bad'), 'malware.exe')
            },
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertIn('Unsupported file type', body.get('error', ''))

    @patch('webapp.routes.generate_title', return_value='Title')
    @patch('webapp.routes.summarize_text', return_value='Summary content')
    @patch('webapp.routes.extract_text_from_image', return_value='Extracted text')
    def test_upload_rolls_back_and_cleans_file_on_commit_failure(self, _ocr, _sum, _title):
        self._login()

        before_files = set(os.listdir(self.temp_upload_dir))

        with patch('webapp.routes.db.session.commit', side_effect=Exception('commit failed')):
            response = self.client.post(
                '/api/upload',
                data={
                    'note_file': (io.BytesIO(b'hello'), 'note.txt')
                },
                content_type='multipart/form-data'
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(StudyNote.query.count(), 0)

        after_files = set(os.listdir(self.temp_upload_dir))
        self.assertEqual(before_files, after_files)

    def test_auth_edge_cases_for_interceptor_contract(self):
        unauth = self.client.get('/api/account')
        self.assertEqual(unauth.status_code, 200)
        self.assertEqual(unauth.get_json().get('authenticated'), False)
        self.assertIsNone(unauth.get_json().get('user'))

        invalid_login = self.client.post('/api/login', json={
            'email': 'tester@example.com',
            'password': 'wrong-password'
        })
        self.assertEqual(invalid_login.status_code, 401)
        self.assertEqual(invalid_login.get_json().get('error'), 'Invalid credentials')

        missing_payload = self.client.post('/api/login', json={'email': 'tester@example.com'})
        self.assertEqual(missing_payload.status_code, 400)

    def test_frontend_routes_return_react_shell(self):
        root_response = self.client.get('/')
        self.assertEqual(root_response.status_code, 200)
        self.assertIn('text/html', root_response.content_type)
        self.assertIn(b'Prepify Test Shell', root_response.data)

        deep_link_response = self.client.get('/library')
        self.assertEqual(deep_link_response.status_code, 200)
        self.assertIn('text/html', deep_link_response.content_type)
        self.assertIn(b'Prepify Test Shell', deep_link_response.data)

    def test_frontend_static_asset_is_served(self):
        response = self.client.get('/static/test.js')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'prepify-test', response.data)

    def test_missing_frontend_build_returns_helpful_message(self):
        os.remove(app.config['FRONTEND_INDEX_PATH'])

        response = self.client.get('/notes/123')
        self.assertEqual(response.status_code, 503)
        self.assertIn(b'npm run build', response.data)

    def test_folder_delete_cascades_note_and_sets(self):
        self._login()

        folder = Folder(name='Folder A', user_id=self.user.id)
        db.session.add(folder)
        db.session.flush()

        note = StudyNote(
            filename='N1',
            original_content='summary',
            user_id=self.user.id,
            folder_id=folder.id
        )
        db.session.add(note)
        db.session.flush()

        db.session.add(FlashcardSet(title='F1', content=json.dumps([{'question': 'Q', 'answer': 'A'}]), note_id=note.id))
        db.session.add(QuizSet(title='Q1', content=json.dumps([{'question': 'Q', 'options': ['A', 'B', 'C', 'D'], 'answer': 'A'}]), note_id=note.id))
        db.session.commit()

        response = self.client.delete(f'/api/folders/{folder.id}')
        self.assertEqual(response.status_code, 200)

        self.assertIsNone(Folder.query.get(folder.id))
        self.assertEqual(StudyNote.query.filter_by(folder_id=folder.id).count(), 0)
        self.assertEqual(FlashcardSet.query.count(), 0)
        self.assertEqual(QuizSet.query.count(), 0)

    def test_quiz_attempt_endpoint_persists_server_scored_result(self):
        self._login()

        note = StudyNote(
            filename='N1',
            original_content='summary',
            user_id=self.user.id,
            folder_id=None
        )
        db.session.add(note)
        db.session.flush()

        quiz = QuizSet(
            title='Q1',
            content=json.dumps([
                {'question': 'One?', 'options': ['A', 'B', 'C', 'D'], 'answer': 'A'},
                {'question': 'Two?', 'options': ['X', 'Y', 'Z', 'W'], 'answer': 'Y'}
            ]),
            note_id=note.id
        )
        db.session.add(quiz)
        db.session.commit()

        post_res = self.client.post(f'/api/quiz_sets/{quiz.id}/attempts', json={
            'answers': {'0': 'A', '1': 'Z'}
        })
        self.assertEqual(post_res.status_code, 201)
        payload = post_res.get_json()
        self.assertEqual(payload.get('score'), 1)
        self.assertEqual(payload.get('total_questions'), 2)
        self.assertEqual(QuizAttempt.query.count(), 1)

        get_res = self.client.get(f'/api/quiz_sets/{quiz.id}/attempts?page=1&limit=10')
        self.assertEqual(get_res.status_code, 200)
        payload = get_res.get_json()
        self.assertEqual(payload['page'], 1)
        self.assertEqual(payload['limit'], 10)
        self.assertEqual(payload['total'], 1)
        self.assertEqual(len(payload['items']), 1)
        self.assertEqual(payload['items'][0]['score'], 1)


if __name__ == '__main__':
    unittest.main()
